from django.contrib import admin

from apps.vendors.models import VendorProfile


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "store_name", "user", "is_approved", "earnings")
    search_fields = ("store_name", "user__email")
    list_filter = ("is_approved",)
    list_editable = ("is_approved",)
    actions = ("approve_selected_vendors", "reject_selected_vendors")

    @admin.action(description="Approve selected vendors")
    def approve_selected_vendors(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f"{updated} vendor(s) approved.")

    @admin.action(description="Reject selected vendors")
    def reject_selected_vendors(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(request, f"{updated} vendor(s) rejected.")
