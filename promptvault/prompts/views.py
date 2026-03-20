from django.contrib.auth.models import User
from django.db import models as db_models
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Tag, Prompt, Vote, AITool, Collection, CollectionItem
from .serializers import (
    CategorySerializer, TagSerializer, AIToolSerializer,
    PromptListSerializer, PromptDetailSerializer,
    RegisterSerializer, CollectionSerializer, CollectionItemSerializer,
)


class AIToolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AITool.objects.all()
    serializer_class = AIToolSerializer
    permission_classes = [AllowAny]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]


class PromptViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'content']
    ordering_fields = ['created_at', 'vote_count', 'copy_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Prompt.objects.select_related('author', 'category').prefetch_related('tags', 'votes', 'compatible_tools')

        if self.request.user.is_authenticated:
            qs = qs.filter(
                db_models.Q(visibility='shared') | db_models.Q(author=self.request.user)
            )
        else:
            qs = qs.filter(visibility='shared')

        category = self.request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category__slug=category)

        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__slug=tag)

        if self.request.query_params.get('hot') == 'true':
            qs = qs.filter(is_hot=True)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return PromptListSerializer
        return PromptDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upvote(self, request, pk=None):
        prompt = self.get_object()
        vote, created = Vote.objects.get_or_create(user=request.user, prompt=prompt)
        if not created:
            vote.delete()
            prompt.vote_count = max(0, prompt.vote_count - 1)
            prompt.save(update_fields=['vote_count'])
            return Response({'voted': False, 'vote_count': prompt.vote_count})
        prompt.vote_count += 1
        prompt.save(update_fields=['vote_count'])
        return Response({'voted': True, 'vote_count': prompt.vote_count})

    @action(detail=True, methods=['post'])
    def copy(self, request, pk=None):
        prompt = self.get_object()
        prompt.copy_count += 1
        prompt.save(update_fields=['copy_count'])
        return Response({'copy_count': prompt.copy_count})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Account created.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })


class CollectionViewSet(viewsets.ModelViewSet):
    """CRUD for the logged-in user's own collections."""
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user).prefetch_related(
            'items__prompt'
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], url_path='add')
    def add_prompt(self, request, pk=None):
        collection = self.get_object()
        prompt_id = request.data.get('prompt_id')
        if not prompt_id:
            return Response({'detail': 'prompt_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            prompt = Prompt.objects.get(pk=prompt_id)
        except Prompt.DoesNotExist:
            return Response({'detail': 'Prompt not found.'}, status=status.HTTP_404_NOT_FOUND)
        item, created = CollectionItem.objects.get_or_create(
            collection=collection, prompt=prompt,
            defaults={'order': collection.items.count()}
        )
        return Response(
            {'added': created, 'item_id': item.id},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['delete'], url_path='remove/(?P<prompt_id>[^/.]+)')
    def remove_prompt(self, request, pk=None, prompt_id=None):
        collection = self.get_object()
        deleted, _ = CollectionItem.objects.filter(
            collection=collection, prompt_id=prompt_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({'detail': 'Not in collection.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='prompts')
    def prompts(self, request, pk=None):
        collection = self.get_object()
        items = collection.items.select_related(
            'prompt__author', 'prompt__category'
        ).prefetch_related(
            'prompt__tags', 'prompt__compatible_tools', 'prompt__votes'
        ).order_by('order', 'added_at')
        prompts = [item.prompt for item in items]
        serializer = PromptListSerializer(prompts, many=True, context={'request': request})
        return Response({'count': len(prompts), 'results': serializer.data})
