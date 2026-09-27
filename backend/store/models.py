from django.db import models
from django.utils import timezone


class Product(models.Model):
    name = models.CharField(max_length=140)
    sku = models.CharField(max_length=32, unique=True)
    category = models.CharField(max_length=64)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["name"]

    @property
    def stock_status(self):
        if self.stock == 0:
            return "Out of stock"
        if self.stock <= 8:
            return "Low stock"
        return "In stock"

    def __str__(self):
        return f"{self.name} ({self.sku})"


class Order(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    reference = models.CharField(max_length=16, unique=True)
    customer = models.CharField(max_length=140)
    email = models.EmailField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PROCESSING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    @property
    def total(self):
        return sum((item.unit_price * item.quantity for item in self.items.all()), start=0)

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())

    def __str__(self):
        return self.reference


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name="order_items", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
