from django.urls import path

from . import views


urlpatterns = [
    path("health/", views.health, name="health"),
    path("summary/", views.summary, name="summary"),
    path("products/", views.products, name="products"),
    path("orders/", views.orders, name="orders"),
]
