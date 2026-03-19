from django.contrib import admin
from .models import Category, Tag, Prompt, Vote, UserProfile, AITool

@admin.register(AITool)
class AIToolAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'provider', 'pricing', 'color']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'color', 'icon', 'order']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'visibility', 'is_hot', 'vote_count', 'copy_count', 'created_at']
    list_filter = ['category', 'visibility', 'is_hot']
    search_fields = ['title', 'description']
    filter_horizontal = ['tags', 'compatible_tools']

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'prompt', 'created_at']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
