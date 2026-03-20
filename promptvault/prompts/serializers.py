from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Category, Tag, AITool, UserProfile, Prompt, Vote, Collection, CollectionItem


class AIToolSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITool
        fields = ['id', 'name', 'slug', 'provider', 'pricing', 'color']


class CategorySerializer(serializers.ModelSerializer):
    prompt_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'color', 'icon', 'order', 'prompt_count']

    def get_prompt_count(self, obj):
        return obj.prompts.filter(visibility='shared').count()


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['avatar_url', 'bio', 'role']


class AuthorSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile']


class PromptListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for library/card view."""
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    compatible_tools = AIToolSerializer(many=True, read_only=True)
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Prompt
        fields = [
            'id', 'title', 'description', 'variables',
            'author', 'category', 'tags', 'compatible_tools',
            'visibility', 'is_hot', 'vote_count', 'copy_count',
            'created_at', 'updated_at', 'has_voted',
        ]

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False


class PromptDetailSerializer(serializers.ModelSerializer):
    """Full serializer with content for detail view."""
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    compatible_tools = AIToolSerializer(many=True, read_only=True)
    has_voted = serializers.SerializerMethodField()
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), source='tags', write_only=True, many=True, required=False
    )
    tool_ids = serializers.PrimaryKeyRelatedField(
        queryset=AITool.objects.all(), source='compatible_tools', write_only=True, many=True, required=False
    )

    class Meta:
        model = Prompt
        fields = [
            'id', 'title', 'description', 'content', 'variables',
            'author', 'category', 'tags', 'compatible_tools',
            'category_id', 'tag_ids', 'tool_ids',
            'visibility', 'is_hot', 'vote_count', 'copy_count',
            'created_at', 'updated_at', 'has_voted',
        ]
        read_only_fields = ['variables', 'vote_count', 'copy_count', 'author']

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        tools = validated_data.pop('compatible_tools', [])
        prompt = Prompt.objects.create(**validated_data)
        prompt.tags.set(tags)
        prompt.compatible_tools.set(tools)
        return prompt

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        tools = validated_data.pop('compatible_tools', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        if tools is not None:
            instance.compatible_tools.set(tools)
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
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


class CollectionItemSerializer(serializers.ModelSerializer):
    prompt = PromptListSerializer(read_only=True)
    prompt_id = serializers.PrimaryKeyRelatedField(
        queryset=Prompt.objects.all(), source='prompt', write_only=True
    )

    class Meta:
        model = CollectionItem
        fields = ['id', 'prompt', 'prompt_id', 'order', 'added_at']


class CollectionSerializer(serializers.ModelSerializer):
    prompt_count = serializers.SerializerMethodField()
    preview_prompts = serializers.SerializerMethodField()
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Collection
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
