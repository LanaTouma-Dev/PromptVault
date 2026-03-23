import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from prompts.models import Category, AITool, Prompt


CATEGORIES = [
    {'name': 'Engineering',   'color': '#3B82F6', 'icon': 'code',        'order': 1},
    {'name': 'Testing',       'color': '#8B5CF6', 'icon': 'bug_report',  'order': 2},
    {'name': 'Architecture',  'color': '#06B6D4', 'icon': 'schema',      'order': 3},
    {'name': 'DevOps',        'color': '#F97316', 'icon': 'terminal',    'order': 4},
    {'name': 'Marketing',     'color': '#EC4899', 'icon': 'campaign',    'order': 5},
    {'name': 'HR',            'color': '#10B981', 'icon': 'people',      'order': 6},
    {'name': 'Code Review',   'color': '#F59E0B', 'icon': 'rate_review', 'order': 7},
    {'name': 'Documentation', 'color': '#6366F1', 'icon': 'description', 'order': 8},
]

AI_TOOLS = [
    {'name': 'ChatGPT',        'provider': 'OpenAI',     'pricing': 'freemium', 'color': '#10a37f'},
    {'name': 'Claude',         'provider': 'Anthropic',  'pricing': 'freemium', 'color': '#cc785c'},
    {'name': 'GPT-4o',         'provider': 'OpenAI',     'pricing': 'paid',     'color': '#10a37f'},
    {'name': 'Gemini',         'provider': 'Google',     'pricing': 'freemium', 'color': '#4285F4'},
    {'name': 'GitHub Copilot', 'provider': 'Microsoft',  'pricing': 'paid',     'color': '#1F2328'},
    {'name': 'Llama 3',        'provider': 'Meta',       'pricing': 'free',     'color': '#0467DF'},
    {'name': 'Mistral',        'provider': 'Mistral AI', 'pricing': 'freemium', 'color': '#FF7000'},
    {'name': 'Grok',           'provider': 'xAI',        'pricing': 'freemium', 'color': '#1DA1F2'},
    {'name': 'Perplexity',     'provider': 'Perplexity', 'pricing': 'freemium', 'color': '#20808D'},
    {'name': 'DeepSeek',       'provider': 'DeepSeek',   'pricing': 'free',     'color': '#4D6BFE'},
    {'name': 'Command R+',     'provider': 'Cohere',     'pricing': 'paid',     'color': '#39594D'},
    {'name': 'Phi-3',          'provider': 'Microsoft',  'pricing': 'free',     'color': '#00A8E0'},
]

PROMPTS = [
    {
        'title': 'Code Review Assistant',
        'description': 'Performs a thorough code review with actionable feedback.',
        'category': 'Code Review',
        'tools': ['ChatGPT', 'Claude', 'GPT-4o'],
        'content': (
            'You are a senior software engineer conducting a code review.\n\n'
            'Review the following {{language}} code and provide:\n'
            '1. Security vulnerabilities\n2. Performance issues\n'
            '3. Code smell and maintainability concerns\n4. Suggested improvements with examples\n\n'
            'Code:\n```\n{{code}}\n```\n\nBe specific, constructive, and prioritise by severity.'
        ),
    },
    {
        'title': 'Unit Test Generator',
        'description': 'Generates comprehensive unit tests for any function.',
        'category': 'Testing',
        'tools': ['ChatGPT', 'GitHub Copilot', 'Claude'],
        'content': (
            'Generate thorough unit tests for the following {{framework}} function.\n\n'
            'Function:\n```{{language}}\n{{function_code}}\n```\n\n'
            'Include: happy path, edge cases, error cases, and boundary values.\n'
            'Use {{test_framework}} syntax. Add descriptive test names.'
        ),
    },
    {
        'title': 'SQL Query Optimizer',
        'description': 'Analyzes and rewrites slow SQL queries.',
        'category': 'Engineering',
        'tools': ['ChatGPT', 'Claude', 'GPT-4o'],
        'content': (
            'You are a database performance expert.\n\n'
            'Optimize this {{database}} query:\n\n'
            '```sql\n{{query}}\n```\n\n'
            'Explain why it is slow, what indexes to add, and provide the optimized version.'
        ),
    },
    {
        'title': 'System Design Document',
        'description': 'Creates a detailed system design document from requirements.',
        'category': 'Architecture',
        'tools': ['Claude', 'GPT-4o', 'Gemini'],
        'content': (
            'Create a system design document for: {{system_name}}\n\n'
            'Requirements: {{requirements}}\nScale: {{expected_scale}}\n\n'
            'Include: architecture overview, components, data flow, '
            'database schema, API contracts, and trade-offs.'
        ),
    },
    {
        'title': 'Docker and CI/CD Setup',
        'description': 'Generates Dockerfile and GitHub Actions workflow.',
        'category': 'DevOps',
        'tools': ['ChatGPT', 'Claude', 'GitHub Copilot'],
        'content': (
            'Generate a production-ready Dockerfile and GitHub Actions CI/CD pipeline for a {{stack}} app.\n\n'
            'Requirements:\n- Multi-stage build\n- Run tests in CI\n'
            '- Deploy to {{deploy_target}} on merge to main\n'
            '- Environment variables: {{environment_vars}}'
        ),
    },
    {
        'title': 'API Documentation Writer',
        'description': 'Writes clean OpenAPI docs from code.',
        'category': 'Documentation',
        'tools': ['Claude', 'ChatGPT'],
        'content': (
            'Write OpenAPI 3.0 documentation for this {{framework}} endpoint:\n\n'
            '```\n{{endpoint_code}}\n```\n\n'
            'Include: summary, description, request body schema, '
            'response schemas (200, 400, 401, 500), and example payloads.'
        ),
    },
    {
        'title': 'Job Description Writer',
        'description': 'Crafts inclusive, compelling job descriptions.',
        'category': 'HR',
        'tools': ['ChatGPT', 'Claude', 'Gemini'],
        'content': (
            'Write a compelling job description for: {{job_title}}\n\n'
            'Team: {{team}}\nLevel: {{seniority}}\nKey skills: {{skills}}\n\n'
            'Make it inclusive, concise, and highlight growth opportunities. '
            'Sections: About the Role, Responsibilities, Requirements, Nice to Have, Benefits.'
        ),
    },
    {
        'title': 'Product Launch Email',
        'description': 'Writes a high-converting product launch email.',
        'category': 'Marketing',
        'tools': ['ChatGPT', 'Claude', 'Gemini'],
        'content': (
            'Write a product launch email for {{product_name}}.\n\n'
            'Target audience: {{audience}}\n'
            'Key benefit: {{main_benefit}}\n'
            'CTA: {{call_to_action}}\n'
            'Tone: {{tone}}\n\n'
            'Keep it under 200 words. Include a punchy subject line.'
        ),
    },
]


class Command(BaseCommand):
    help = 'Seeds categories, AI tools, sample prompts, and a superuser.'

    def handle(self, *args, **options):
        self.stdout.write('--- Seeding database ---')

        # Superuser from env vars
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email    = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@promptvault.app')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin1234!')

        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(username, email, password)
            self.stdout.write(self.style.SUCCESS(f'  Superuser: {username} / {password}'))
        else:
            user = User.objects.get(username=username)
            self.stdout.write(f'  Superuser exists: {username}')

        # Categories
        cat_map = {}
        for c in CATEGORIES:
            obj, created = Category.objects.get_or_create(
                name=c['name'],
                defaults={'color': c['color'], 'icon': c['icon'], 'order': c['order']},
            )
            cat_map[c['name']] = obj
            if created:
                self.stdout.write(f'  Category: {obj.name}')

        # AI Tools
        tool_map = {}
        for t in AI_TOOLS:
            obj, created = AITool.objects.get_or_create(
                name=t['name'],
                defaults={'provider': t['provider'], 'pricing': t['pricing'], 'color': t['color']},
            )
            tool_map[t['name']] = obj
            if created:
                self.stdout.write(f'  AITool: {obj.name}')

        # Prompts
        for p in PROMPTS:
            if Prompt.objects.filter(title=p['title']).exists():
                continue
            prompt = Prompt.objects.create(
                title=p['title'],
                description=p['description'],
                content=p['content'],
                author=user,
                category=cat_map.get(p['category']),
                visibility='shared',
                is_hot=True,
            )
            prompt.compatible_tools.set([tool_map[t] for t in p['tools'] if t in tool_map])
            self.stdout.write(f'  Prompt: {prompt.title}')

        self.stdout.write(self.style.SUCCESS('--- Seed complete ---'))
