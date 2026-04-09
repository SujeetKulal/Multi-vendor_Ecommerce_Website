from django.urls import path

from apps.orders.views import (
    AdminOrderListAPIView,
    AdminOrderStatusAPIView,
    CheckoutAPIView,
    CustomerOrderListAPIView,
    VendorEarningsAnalyticsAPIView,
    VendorFinancialsAPIView,
    VendorOrderItemListAPIView,
    VendorOrderItemStatusAPIView,
)


urlpatterns = [
    path("checkout/", CheckoutAPIView.as_view(), name="checkout"),
    path("my-orders/", CustomerOrderListAPIView.as_view(), name="my-orders"),
    path("vendor/items/", VendorOrderItemListAPIView.as_view(), name="vendor-items"),
    path("vendor/items/<int:pk>/status/", VendorOrderItemStatusAPIView.as_view(), name="vendor-item-status"),
    path("vendor/financials/", VendorFinancialsAPIView.as_view(), name="vendor-financials"),
    path("vendor/analytics/", VendorEarningsAnalyticsAPIView.as_view(), name="vendor-analytics"),
    path("admin/all/", AdminOrderListAPIView.as_view(), name="admin-order-list"),
    path("admin/<int:pk>/status/", AdminOrderStatusAPIView.as_view(), name="admin-order-status"),
]
