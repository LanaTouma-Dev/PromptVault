from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIToolViewSet, CategoryViewSet, TagViewSet,
    PromptViewSet, CommentViewSet,
    RegisterView, MeView, PublicProfileView,
    CollectionViewSet,
)

router = DefaultRouter()
router.register('ai-tools',    AIToolViewSet,    basename='aitool')
router.register('categories',  CategoryViewSet,  basename='category')
router.register('tags',        TagViewSet,        basename='tag')
router.register('prompts',     PromptViewSet,     basename='prompt')
router.register('comments',    CommentViewSet,    basename='comment')
router.register('collections', CollectionViewSet, basename='collection')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/',           RegisterView.as_view(),                   name='register'),
    path('auth/me/',                 MeView.as_view(),                         name='me'),
    path('profile/<str:username>/',  PublicProfileView.as_view(),              name='public-profile'),
]
