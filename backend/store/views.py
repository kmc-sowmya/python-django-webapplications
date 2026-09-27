import json
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import DatabaseError, IntegrityError, connection, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Order, OrderItem, Product


def product_data(product):
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "price": float(product.unit_price),
        "stock": product.stock,
        "stockStatus": product.stock_status,
    }


def order_data(order):
    return {
        "id": order.id,
        "reference": order.reference,
        "customer": order.customer,
        "email": order.email,
        "status": order.status,
        "createdAt": timezone.localtime(order.created_at).isoformat(),
        "total": float(order.total),
        "itemCount": order.item_count,
        "items": [
            {
                "name": item.product.name,
                "quantity": item.quantity,
                "unitPrice": float(item.unit_price),
            }
            for item in order.items.select_related("product").all()
        ],
    }


def json_body(request):
    try:
        data = json.loads(request.body or "{}")
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
        return None


@require_GET
def health(request):
    try:
        connection.ensure_connection()
    except DatabaseError:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ok", "service": "northstar-commerce-api", "environment": settings.APP_ENV})


@require_GET
def summary(request):
    today = timezone.localdate()
    start = today - timedelta(days=6)
    previous_start = start - timedelta(days=7)
    non_cancelled = Order.objects.exclude(status=Order.Status.CANCELLED)
    total_revenue = sum(
        (order.total for order in non_cancelled.prefetch_related("items")),
        start=Decimal("0.00"),
    )
    current_revenue = sum(
        (order.total for order in non_cancelled.filter(created_at__date__gte=start).prefetch_related("items")),
        start=Decimal("0.00"),
    )
    previous_revenue = sum(
        (
            order.total
            for order in non_cancelled.filter(
                created_at__date__gte=previous_start,
                created_at__date__lt=start,
            ).prefetch_related("items")
        ),
        start=Decimal("0.00"),
    )
    weekly = []
    for offset in range(7):
        day = start + timedelta(days=offset)
        day_orders = non_cancelled.filter(created_at__date=day).prefetch_related("items")
        day_total = sum((order.total for order in day_orders), start=Decimal("0.00"))
        weekly.append({"label": day.strftime("%a"), "revenue": float(day_total), "orders": day_orders.count()})

    revenue_change = 0
    if previous_revenue:
        revenue_change = round(float((current_revenue - previous_revenue) / previous_revenue * 100), 1)

    return JsonResponse(
        {
            "revenue": float(total_revenue),
            "revenueChange": revenue_change,
            "orderCount": Order.objects.count(),
            "saleCount": non_cancelled.count(),
            "productCount": Product.objects.count(),
            "lowStockCount": Product.objects.filter(stock__lte=8).count(),
            "averageOrder": float(total_revenue / max(non_cancelled.count(), 1)),
            "weekly": weekly,
        }
    )


@require_http_methods(["GET", "POST"])
@csrf_exempt
def products(request):
    if request.method == "GET":
        search = request.GET.get("q", "").strip()
        items = Product.objects.all()
        if search:
            items = items.filter(name__icontains=search) | items.filter(sku__icontains=search)
        return JsonResponse({"results": [product_data(product) for product in items]})

    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)
    try:
        name = str(data.get("name", "")).strip()
        sku = str(data.get("sku", "")).strip().upper()
        category = str(data.get("category", "")).strip()
        price = Decimal(str(data.get("price", "")))
        stock = int(data.get("stock", ""))
        if not name or not sku or not category or price <= 0 or stock < 0:
            raise ValueError
        with transaction.atomic():
            product = Product.objects.create(
                name=name,
                sku=sku,
                category=category,
                unit_price=price,
                stock=stock,
            )
    except IntegrityError:
        return JsonResponse({"error": "That SKU is already in use."}, status=409)
    except (InvalidOperation, TypeError, ValueError):
        return JsonResponse({"error": "Enter a name, SKU, category, positive price, and non-negative stock."}, status=400)
    return JsonResponse(product_data(product), status=201)


@require_http_methods(["GET", "POST"])
@csrf_exempt
def orders(request):
    if request.method == "GET":
        items = Order.objects.prefetch_related("items__product").all()
        status = request.GET.get("status", "").strip()
        search = request.GET.get("q", "").strip()
        if status:
            items = items.filter(status=status)
        if search:
            items = items.filter(reference__icontains=search) | items.filter(customer__icontains=search)
        return JsonResponse({"results": [order_data(order) for order in items]})

    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)
    try:
        customer = str(data.get("customer", "")).strip()
        email = str(data.get("email", "")).strip()
        quantity = int(data.get("quantity", 1))
        product_id = int(data.get("productId", 0))
        if not customer or quantity < 1:
            raise ValueError
        if email:
            validate_email(email)
    except (TypeError, ValueError, ValidationError):
        return JsonResponse({"error": "Enter a customer name, a valid optional email, and a quantity of at least one."}, status=400)

    try:
        with transaction.atomic():
            product = Product.objects.select_for_update().get(pk=product_id)
            if product.stock < quantity:
                return JsonResponse({"error": "There is not enough stock for this order."}, status=409)
            product.stock -= quantity
            product.save(update_fields=["stock"])
            order = Order.objects.create(
                reference=f"ORD-{uuid4().hex[:7].upper()}",
                customer=customer,
                email=email,
            )
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=product.unit_price,
            )
    except Product.DoesNotExist:
        return JsonResponse({"error": "Choose a product that is still available."}, status=404)
    return JsonResponse(order_data(order), status=201)
