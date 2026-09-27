from decimal import Decimal

from django.test import Client, TestCase
from django.urls import reverse

from .models import Order, Product


class CommerceApiTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Ridge water bottle",
            sku="NS-ACC-014",
            category="Accessories",
            unit_price=Decimal("42.00"),
            stock=5,
        )

    def test_health_and_empty_summary(self):
        health = self.client.get(reverse("health"))
        summary = self.client.get(reverse("summary"))

        self.assertEqual(health.json()["status"], "ok")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.json()["productCount"], 1)
        self.assertEqual(len(summary.json()["weekly"]), 7)

    def test_order_creation_reserves_stock_and_appears_in_list(self):
        response = self.client.post(
            reverse("orders"),
            {
                "customer": "Jamie Lee",
                "email": "jamie@example.com",
                "productId": self.product.id,
                "quantity": 2,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["total"], 84.0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(self.client.get(reverse("orders")).json()["results"][0]["customer"], "Jamie Lee")

    def test_order_cannot_exceed_available_stock(self):
        response = self.client.post(
            reverse("orders"),
            {
                "customer": "Jamie Lee",
                "email": "jamie@example.com",
                "productId": self.product.id,
                "quantity": 6,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_api_accepts_local_post_without_csrf_cookie(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            reverse("orders"),
            {
                "customer": "Jamie Lee",
                "email": "",
                "productId": self.product.id,
                "quantity": 1,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

    def test_duplicate_sku_is_reported_as_conflict(self):
        response = self.client.post(
            reverse("products"),
            {
                "name": "Another bottle",
                "sku": "NS-ACC-014",
                "category": "Accessories",
                "price": "25.00",
                "stock": 4,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("SKU", response.json()["error"])
