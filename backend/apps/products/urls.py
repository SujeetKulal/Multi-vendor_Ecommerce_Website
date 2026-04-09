from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.products.views import CategoryListAPIView, ProductReviewListCreateAPIView, ProductViewSet


router = DefaultRouter()
router.register("", ProductViewSet, basename="products")

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="product-categories"),
    path("<int:product_id>/reviews/", ProductReviewListCreateAPIView.as_view(), name="product-reviews"),
    path("", include(router.urls)),
]
