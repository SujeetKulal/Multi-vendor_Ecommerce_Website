from rest_framework import generics, permissions

from apps.accounts.models import CustomUser, ShippingProfile
from apps.accounts.serializers import AdminUserSerializer, RegisterSerializer, ShippingProfileSerializer, UserSerializer
from apps.vendors.permissions import IsAdminRole


class RegisterAPIView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class ProfileAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AdminUserListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = CustomUser.objects.all().order_by("-date_joined")
        search = self.request.query_params.get("search")
        role = self.request.query_params.get("role")
        if search:
            queryset = queryset.filter(email__icontains=search)
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class AdminUserUpdateAPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = AdminUserSerializer
    queryset = CustomUser.objects.all()


class ShippingProfileAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ShippingProfileSerializer

    def get_object(self):
        profile, _ = ShippingProfile.objects.get_or_create(user=self.request.user)
        return profile
