from django.urls import path

from apps.accounts.views import (
    AdminUserListAPIView,
    AdminUserUpdateAPIView,
    ProfileAPIView,
    RegisterAPIView,
    ShippingProfileAPIView,
)


urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("me/", ProfileAPIView.as_view(), name="profile"),
    path("shipping-profile/", ShippingProfileAPIView.as_view(), name="shipping-profile"),
    path("admin/users/", AdminUserListAPIView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", AdminUserUpdateAPIView.as_view(), name="admin-user-update"),
]
