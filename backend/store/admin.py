from django.contrib import admin

from .models import Order, OrderItem, Product


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "unit_price", "stock")
    search_fields = ("name", "sku", "category")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "customer", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("reference", "customer", "email")
    inlines = (OrderItemInline,)
