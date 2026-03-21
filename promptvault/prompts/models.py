import re
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


def extract_variables(content):
    return sorted(set(re.findall(r'\{\{(\w+)\}\}', content)))


class Category(models.Model):
    name  = models.CharField(max_length=100)
    slug  = models.SlugField(unique=True, blank=True)
    color = models.CharField(max_length=30, default='blue')
    icon  = models.CharField(max_length=50, default='folder')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar_url = models.URLField(blank=True)
    bio        = models.TextField(blank=True)
    role       = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'{self.user.username} profile'

    @property
    def reputation(self):
        """
        Reputation formula:
          +10  per upvote received on any prompt
          +25  per fork of any prompt (someone found it worth building on)
          +5   per time any prompt is saved to a collection
        """
        prompts = self.user.prompts.all()
        votes_score = sum(p.vote_count for p in prompts) * 10
        forks_score = sum(p.forks.count() for p in prompts) * 25
        saves_score = sum(p.collection_items.count() for p in prompts) * 5
        return votes_score + forks_score + saves_score


class AITool(models.Model):
    PRICING_CHOICES = [
        ('free',     'Free'),
        ('freemium', 'Free tier available'),
        ('paid',     'Paid only'),
    ]
    name     = models.CharField(max_length=100)
    slug     = models.SlugField(unique=True, blank=True)
    provider = models.CharField(max_length=100, blank=True)
    pricing  = models.CharField(max_length=20, choices=PRICING_CHOICES, default='paid')
    color    = models.CharField(max_length=30, default='slate')

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Prompt(models.Model):
    VISIBILITY_SHARED  = 'shared'
    VISIBILITY_PRIVATE = 'private'
    VISIBILITY_CHOICES = [
        (VISIBILITY_SHARED,  'Shared'),
        (VISIBILITY_PRIVATE, 'Private'),
    ]

    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    content     = models.TextField()
    variables   = models.JSONField(default=list, blank=True)

    author   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='prompts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='prompts')
    tags             = models.ManyToManyField(Tag,     blank=True, related_name='prompts')
    compatible_tools = models.ManyToManyField(AITool,  blank=True, related_name='prompts')

    # ── Forking ──────────────────────────────────────────────────────────────
    forked_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='forks'
    )

    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=VISIBILITY_SHARED)
    is_hot     = models.BooleanField(default=False)
    vote_count = models.IntegerField(default=0)
    copy_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.variables = extract_variables(self.content)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def fork_count(self):
        return self.forks.count()


class Vote(models.Model):
    user   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes')
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'prompt')

    def __str__(self):
        return f'{self.user.username} → {self.prompt.title}'


class Comment(models.Model):
    prompt    = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='comments')
    author    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    parent    = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies'
    )
    body      = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.author.username} on "{self.prompt.title}"'


class Collection(models.Model):
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collections')
    name        = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    icon        = models.CharField(max_length=10, default='')
    is_public   = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.owner.username}: {self.name}'

    @property
    def prompt_count(self):
        return self.items.count()


class CollectionItem(models.Model):
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='items')
    prompt     = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='collection_items')
    order      = models.PositiveIntegerField(default=0)
    added_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('collection', 'prompt')
        ordering = ['order', 'added_at']

    def __str__(self):
        return f'{self.collection.name} ← {self.prompt.title}'
