from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Category, Tag, AITool, UserProfile, Prompt, Vote, Comment, Collection, CollectionItem, PromptShare


class AIToolSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AITool
        fields = ['id', 'name', 'slug', 'provider', 'pricing', 'color']


class CategorySerializer(serializers.ModelSerializer):
    prompt_count = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'color', 'icon', 'order', 'prompt_count']

    def get_prompt_count(self, obj):
        return obj.prompts.filter(visibility='shared').count()


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tag
        fields = ['id', 'name', 'slug']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserProfile
        fields = ['avatar_url', 'bio', 'role']


class AuthorSerializer(serializers.ModelSerializer):
    profile    = UserProfileSerializer(read_only=True)
    reputation = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile', 'reputation']

    def get_reputation(self, obj):
        try:
            return obj.profile.reputation
        except UserProfile.DoesNotExist:
            return 0


# ── Fork origin (lightweight) ─────────────────────────────────────────────────

class ForkOriginSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model  = Prompt
        fields = ['id', 'title', 'author']

    def get_author(self, obj):
        if not obj.author:
            return None
        return {'id': obj.author.id, 'username': obj.author.username}


# ── Prompt serializers ────────────────────────────────────────────────────────

class PromptListSerializer(serializers.ModelSerializer):
    author           = AuthorSerializer(read_only=True)
    category         = CategorySerializer(read_only=True)
    tags             = TagSerializer(many=True, read_only=True)
    compatible_tools = AIToolSerializer(many=True, read_only=True)
    has_voted        = serializers.SerializerMethodField()
    fork_count       = serializers.IntegerField(read_only=True)
    forked_from      = ForkOriginSerializer(read_only=True)
    shared_by        = serializers.SerializerMethodField()

    class Meta:
        model  = Prompt
        fields = [
            'id', 'title', 'description', 'variables',
            'author', 'category', 'tags', 'compatible_tools',
            'visibility', 'is_hot', 'vote_count', 'copy_count', 'fork_count',
            'forked_from', 'created_at', 'updated_at', 'has_voted', 'shared_by',
        ]

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False

    def get_shared_by(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            share = obj.shares.filter(shared_with=request.user).select_related('shared_by').first()
            if share:
                return {'id': share.shared_by.id, 'username': share.shared_by.username}
        return None


class PromptDetailSerializer(serializers.ModelSerializer):
    author           = AuthorSerializer(read_only=True)
    category         = CategorySerializer(read_only=True)
    tags             = TagSerializer(many=True, read_only=True)
    compatible_tools = AIToolSerializer(many=True, read_only=True)
    has_voted        = serializers.SerializerMethodField()
    fork_count       = serializers.IntegerField(read_only=True)
    forked_from      = ForkOriginSerializer(read_only=True)
    comment_count    = serializers.SerializerMethodField()

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category',
        write_only=True, required=False, allow_null=True
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), source='tags',
        write_only=True, many=True, required=False
    )
    tool_ids = serializers.PrimaryKeyRelatedField(
        queryset=AITool.objects.all(), source='compatible_tools',
        write_only=True, many=True, required=False
    )

    class Meta:
        model  = Prompt
        fields = [
            'id', 'title', 'description', 'content', 'variables',
            'author', 'category', 'tags', 'compatible_tools',
            'category_id', 'tag_ids', 'tool_ids',
            'visibility', 'is_hot', 'vote_count', 'copy_count', 'fork_count',
            'forked_from', 'comment_count',
            'created_at', 'updated_at', 'has_voted',
        ]
        read_only_fields = ['variables', 'vote_count', 'copy_count', 'author']

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False

    def get_comment_count(self, obj):
        return obj.comments.count()

    def create(self, validated_data):
        tags  = validated_data.pop('tags', [])
        tools = validated_data.pop('compatible_tools', [])
        prompt = Prompt.objects.create(**validated_data)
        prompt.tags.set(tags)
        prompt.compatible_tools.set(tools)
        return prompt

    def update(self, instance, validated_data):
        tags  = validated_data.pop('tags', None)
        tools = validated_data.pop('compatible_tools', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags  is not None: instance.tags.set(tags)
        if tools is not None: instance.compatible_tools.set(tools)
        return instance


# ── Comments ─────────────────────────────────────────────────────────────────

class CommentAuthorSerializer(serializers.ModelSerializer):
    reputation = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'first_name', 'last_name', 'reputation']

    def get_reputation(self, obj):
        try:
            return obj.profile.reputation
        except UserProfile.DoesNotExist:
            return 0


class CommentSerializer(serializers.ModelSerializer):
    author  = CommentAuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model  = Comment
        fields = ['id', 'prompt', 'author', 'parent', 'body', 'replies', 'created_at', 'updated_at']
        read_only_fields = ['author', 'created_at', 'updated_at']

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []


# ── Auth / Profile ────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class PublicProfileSerializer(serializers.ModelSerializer):
    profile    = UserProfileSerializer(read_only=True)
    reputation = serializers.SerializerMethodField()
    prompt_count = serializers.SerializerMethodField()
    fork_count   = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'first_name', 'last_name',
                  'profile', 'reputation', 'prompt_count', 'fork_count',
                  'date_joined']

    def get_reputation(self, obj):
        try:
            return obj.profile.reputation
        except UserProfile.DoesNotExist:
            return 0

    def get_prompt_count(self, obj):
        return obj.prompts.filter(visibility='shared').count()

    def get_fork_count(self, obj):
        return sum(p.forks.count() for p in obj.prompts.all())


# ── Prompt sharing ────────────────────────────────────────────────────────────

class PromptShareSerializer(serializers.ModelSerializer):
    shared_with_id       = serializers.IntegerField(source='shared_with.id', read_only=True)
    shared_with_username = serializers.CharField(source='shared_with.username', read_only=True)

    class Meta:
        model  = PromptShare
        fields = ['id', 'shared_with_id', 'shared_with_username', 'created_at']


# ── Collections ───────────────────────────────────────────────────────────────

class CollectionItemSerializer(serializers.ModelSerializer):
    prompt = PromptListSerializer(read_only=True)
    prompt_id = serializers.PrimaryKeyRelatedField(
        queryset=Prompt.objects.all(), source='prompt', write_only=True
    )

    class Meta:
        model  = CollectionItem
        fields = ['id', 'prompt', 'prompt_id', 'order', 'added_at']


class CollectionSerializer(serializers.ModelSerializer):
    prompt_count    = serializers.SerializerMethodField()
    preview_prompts = serializers.SerializerMethodField()
    owner_username  = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model  = Collection
        fields = [
            'id', 'name', 'description', 'icon', 'is_public',
            'prompt_count', 'preview_prompts', 'owner_username',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['owner_username', 'prompt_count', 'preview_prompts', 'created_at', 'updated_at']

    def get_prompt_count(self, obj):
        return obj.items.count()

    def get_preview_prompts(self, obj):
        items = obj.items.select_related('prompt').order_by('order', 'added_at')[:3]
        return [{'id': i.prompt.id, 'title': i.prompt.title} for i in items]
