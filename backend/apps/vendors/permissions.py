from rest_framework.permissions import BasePermission

from apps.accounts.models import CustomUser


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == CustomUser.Role.ADMIN)


class IsVendorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == CustomUser.Role.VENDOR)


class IsApprovedVendor(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role != CustomUser.Role.VENDOR:
            return False
        profile = getattr(request.user, "vendor_profile", None)
        return bool(profile and profile.is_approved)
