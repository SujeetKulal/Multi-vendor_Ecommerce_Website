from django.urls import path

from apps.vendors.views import VendorApprovalAPIView, VendorListAPIView, VendorProfileMeAPIView


urlpatterns = [
    path("me/", VendorProfileMeAPIView.as_view(), name="vendor-me"),
    path("", VendorListAPIView.as_view(), name="vendor-list"),
    path("<int:pk>/approve/", VendorApprovalAPIView.as_view(), name="vendor-approve"),
]
