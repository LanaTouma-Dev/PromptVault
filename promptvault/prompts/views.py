from django.contrib.auth.models import User
from django.db import models as db_models
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Tag, Prompt, Vote, AITool, Comment, Collection, CollectionItem
from .serializers import (
    CategorySerializer, TagSerializer, AIToolSerializer,
    PromptListSerializer, PromptDetailSerializer,
    CommentSerializer, RegisterSerializer,
    CollectionSerializer, CollectionItemSerializer,
    PublicProfileSerializer,
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
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['title', 'description', 'content']
    ordering_fields    = ['created_at', 'vote_count', 'copy_count']
    ordering           = ['-created_at']

    def get_queryset(self):
        qs = Prompt.objects.select_related('author', 'category', 'forked_from__author') \
                           .prefetch_related('tags', 'votes', 'compatible_tools', 'forks')

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

        # ?mine=true → only prompts authored by the current user (excludes forks)
        if self.request.query_params.get('mine') == 'true':
            if self.request.user.is_authenticated:
                qs = qs.filter(author=self.request.user, forked_from__isnull=True)

        # ?forked=true → only forks authored by the current user
        if self.request.query_params.get('forked') == 'true':
            if self.request.user.is_authenticated:
                qs = qs.filter(author=self.request.user, forked_from__isnull=False)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return PromptListSerializer
        return PromptDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def update(self, request, *args, **kwargs):
        prompt = self.get_object()
        # Only the author can edit their own prompt
        if prompt.author != request.user:
            return Response({'detail': 'You cannot edit someone else\'s prompt.'}, status=status.HTTP_403_FORBIDDEN)

        # Visibility guard: a fork can only be made shared if the original is shared
        new_visibility = request.data.get('visibility')
        if new_visibility == 'shared' and prompt.forked_from:
            if prompt.forked_from.visibility != 'shared':
                return Response(
                    {'detail': 'You cannot publish this fork because the original prompt is private.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)

    # ── Upvote ────────────────────────────────────────────────────────────────

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

    # ── Copy tracking ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def copy(self, request, pk=None):
        prompt = self.get_object()
        prompt.copy_count += 1
        prompt.save(update_fields=['copy_count'])
        return Response({'copy_count': prompt.copy_count})

    # ── Fork ──────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def fork(self, request, pk=None):
        original = self.get_object()

        # Prevent forking your own prompt
        if original.author == request.user:
            return Response(
                {'detail': 'You cannot fork your own prompt.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        forked = Prompt.objects.create(
            title       = f'{original.title} (fork)',
            description = original.description,
            content     = original.content,
            category    = original.category,
            visibility  = 'private',   # forks start private so the user can tweak
            author      = request.user,
            forked_from = original,
        )
        forked.tags.set(original.tags.all())
        forked.compatible_tools.set(original.compatible_tools.all())

        serializer = PromptDetailSerializer(forked, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Forks list ────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='forks')
    def forks_list(self, request, pk=None):
        prompt = self.get_object()
        forks  = prompt.forks.filter(visibility='shared') \
                             .select_related('author', 'category') \
                             .prefetch_related('tags', 'votes', 'compatible_tools')
        serializer = PromptListSerializer(forks, many=True, context={'request': request})
        return Response({'count': forks.count(), 'results': serializer.data})

    # ── Comments ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='comments')
    def comments(self, request, pk=None):
        prompt = self.get_object()
        # Only return top-level comments; replies are nested inside each via serializer
        top_level = prompt.comments.filter(parent__isnull=True) \
                                   .select_related('author__profile') \
                                   .prefetch_related('replies__author__profile')
        serializer = CommentSerializer(top_level, many=True, context={'request': request})
        return Response({'count': top_level.count(), 'results': serializer.data})

    @action(detail=True, methods=['post'], url_path='comments/add',
            permission_classes=[IsAuthenticated])
    def add_comment(self, request, pk=None):
        prompt = self.get_object()
        body   = request.data.get('body', '').strip()
        if not body:
            return Response({'detail': 'body is required.'}, status=status.HTTP_400_BAD_REQUEST)

        parent_id = request.data.get('parent_id')
        parent    = None
        if parent_id:
            try:
                parent = Comment.objects.get(pk=parent_id, prompt=prompt)
            except Comment.DoesNotExist:
                return Response({'detail': 'Parent comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment = Comment.objects.create(
            prompt=prompt, author=request.user, parent=parent, body=body
        )
        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentViewSet(viewsets.ModelViewSet):
    """
    Allows editing and deleting individual comments.
    Only the comment author can modify/delete.
    """
    serializer_class   = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(author=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        try:
            rep = user.profile.reputation
        except Exception:
            rep = 0
        return Response({
            'id':         user.id,
            'username':   user.username,
            'email':      user.email,
            'first_name': user.first_name,
            'last_name':  user.last_name,
            'reputation': rep,
            'date_joined': user.date_joined,
        })


class PublicProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        try:
            user = User.objects.select_related('profile').get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PublicProfileSerializer(user, context={'request': request})
        return Response(serializer.data)


class CollectionViewSet(viewsets.ModelViewSet):
    serializer_class   = CollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user).prefetch_related('items__prompt')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], url_path='add')
    def add_prompt(self, request, pk=None):
        collection = self.get_object()
        prompt_id  = request.data.get('prompt_id')
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
            'prompt__author', 'prompt__category', 'prompt__forked_from__author'
        ).prefetch_related(
            'prompt__tags', 'prompt__compatible_tools', 'prompt__votes', 'prompt__forks'
        ).order_by('order', 'added_at')
        prompts    = [item.prompt for item in items]
        serializer = PromptListSerializer(prompts, many=True, context={'request': request})
        return Response({'count': len(prompts), 'results': serializer.data})
