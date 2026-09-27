from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from store.models import Order, OrderItem, Product


class Command(BaseCommand):
    help = "Create or refresh the Northstar Goods demo catalog and orders."

    products = [
        ("Meridian weekender", "NS-ACC-021", "Accessories", "128.00", 3),
        ("Studio wireless earbuds", "NS-AUD-018", "Audio", "149.00", 5),
        ("Stoneware pour-over set", "NS-HOM-007", "Home", "54.00", 18),
        ("Everyday cotton tee", "NS-APP-015", "Apparel", "38.00", 42),
        ("Field notes speaker", "NS-AUD-009", "Audio", "86.00", 2),
        ("Canvas market tote", "NS-ACC-033", "Accessories", "26.00", 0),
        ("Linen throw blanket", "NS-HOM-011", "Home", "112.00", 11),
        ("Ridge water bottle", "NS-ACC-014", "Accessories", "42.00", 7),
    ]

    orders = [
        ("ORD-10482", "Sophie Carter", "sophie@example.com", "processing", 0, [("NS-ACC-021", 1), ("NS-ACC-014", 1)]),
        ("ORD-10481", "Marcus Chen", "marcus@example.com", "shipped", 1, [("NS-AUD-018", 1)]),
        ("ORD-10480", "Ava Thompson", "ava@example.com", "delivered", 2, [("NS-HOM-007", 2)]),
        ("ORD-10479", "Noah Williams", "noah@example.com", "processing", 3, [("NS-APP-015", 2), ("NS-ACC-033", 1)]),
        ("ORD-10478", "Mia Patel", "mia@example.com", "delivered", 4, [("NS-AUD-009", 1)]),
        ("ORD-10477", "Ethan Brooks", "ethan@example.com", "shipped", 5, [("NS-HOM-011", 1)]),
        ("ORD-10476", "Isabella Reed", "isabella@example.com", "delivered", 6, [("NS-ACC-014", 2)]),
        ("ORD-10475", "Liam Foster", "liam@example.com", "cancelled", 9, [("NS-AUD-018", 1)]),
    ]

    @transaction.atomic
    def handle(self, *args, **options):
        catalog = {}
        for name, sku, category, price, stock in self.products:
            product, _ = Product.objects.update_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "category": category,
                    "unit_price": Decimal(price),
                    "stock": stock,
                },
            )
            catalog[sku] = product

        created_count = 0
        now = timezone.now()
        for reference, customer, email, status, days_ago, lines in self.orders:
            order, created = Order.objects.get_or_create(
                reference=reference,
                defaults={
                    "customer": customer,
                    "email": email,
                    "status": status,
                    "created_at": now - timedelta(days=days_ago),
                },
            )
            if not created:
                continue
            created_count += 1
            for sku, quantity in lines:
                product = catalog[sku]
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price=product.unit_price,
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo data ready: {len(catalog)} products, {Order.objects.count()} orders "
                f"({created_count} new orders)."
            )
        )
