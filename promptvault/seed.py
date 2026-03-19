"""Run with: python manage.py shell < seed.py"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'promptvault.settings')
django.setup()

from django.contrib.auth.models import User
from prompts.models import Category, Tag, Prompt, UserProfile, AITool

# Admin user
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser('admin', 'admin@promptvault.io', 'admin123')
    UserProfile.objects.create(user=admin, role='Admin')
    print('Created admin user (admin / admin123)')

# Demo user
if not User.objects.filter(username='sarah').exists():
    sarah = User.objects.create_user('sarah', 'sarah@dev.io', 'sarah123', first_name='Sarah', last_name='Jenkins')
    UserProfile.objects.create(user=sarah, role='Senior Engineer')
    print('Created demo user (sarah / sarah123)')
else:
    sarah = User.objects.get(username='sarah')

# Categories
cats_data = [
    ('Debugging', 'debugging', 'bug_report', 'red', 1),
    ('Code Review', 'code-review', 'rate_review', 'blue', 2),
    ('Testing', 'testing', 'science', 'green', 3),
    ('Architecture', 'architecture', 'architecture', 'purple', 4),
    ('DevOps', 'devops', 'cloud', 'orange', 5),
    ('Frontend', 'frontend', 'web', 'cyan', 6),
    ('Backend', 'backend', 'dns', 'indigo', 7),
]
cats = {}
for name, slug, icon, color, order in cats_data:
    c, _ = Category.objects.get_or_create(slug=slug, defaults={'name': name, 'icon': icon, 'color': color, 'order': order})
    cats[slug] = c
print(f'Created {len(cats)} categories')

# Tags
tag_names = ['react', 'typescript', 'python', 'django', 'postgresql', 'docker', 'kubernetes', 'graphql', 'rest-api', 'testing']
tags = {}
for t in tag_names:
    tag, _ = Tag.objects.get_or_create(name=t, defaults={'slug': t})
    tags[t] = tag
print(f'Created {len(tags)} tags')

# AI Tools
tools_data = [
    ('Claude',        'claude',        'Anthropic', 'freemium', 'violet'),
    ('ChatGPT',       'chatgpt',       'OpenAI',    'freemium', 'emerald'),
    ('GPT-4o',        'gpt-4o',        'OpenAI',    'paid',     'green'),
    ('Gemini',        'gemini',        'Google',    'freemium', 'blue'),
    ('GitHub Copilot','github-copilot','GitHub',    'paid',     'slate'),
    ('Llama 3',       'llama-3',       'Meta',      'free',     'orange'),
    ('Mistral',       'mistral',       'Mistral AI','freemium', 'amber'),
]
tools = {}
for name, slug, provider, pricing, color in tools_data:
    t, _ = AITool.objects.get_or_create(slug=slug, defaults={'name': name, 'provider': provider, 'pricing': pricing, 'color': color})
    tools[slug] = t
print(f'Created {len(tools)} AI tools')

# Prompts
prompts_data = [
    {
        'title': 'Optimize SQL Queries V2',
        'description': 'Aggressive optimization for PostgreSQL indexes and join logic.',
        'content': 'You are a PostgreSQL expert. Analyze the following query and suggest optimizations:\n\n```sql\n{{query}}\n```\n\nFocus on: index usage, join order, query plan, and execution time. The database has {{row_count}} rows in the main table.',
        'category': 'debugging',
        'tags': ['postgresql', 'python'],
        'tools': ['claude', 'chatgpt', 'gpt-4o'],
        'is_hot': True,
        'vote_count': 42,
        'copy_count': 128,
    },
    {
        'title': 'K8s YAML Security Scan',
        'description': 'Audits container privilege escalation issues.',
        'content': 'Review the following Kubernetes YAML manifest for security issues:\n\n```yaml\n{{yaml_content}}\n```\n\nCheck for: privileged containers, hostPath mounts, missing resource limits, insecure capabilities, and missing network policies.',
        'category': 'devops',
        'tags': ['kubernetes', 'docker'],
        'tools': ['claude', 'chatgpt', 'gemini'],
        'is_hot': True,
        'vote_count': 38,
        'copy_count': 95,
    },
    {
        'title': 'React RSC Refactor',
        'description': 'Convert client components to React Server Components safely.',
        'content': 'Analyze this React component and refactor it as a React Server Component:\n\n```tsx\n{{component_code}}\n```\n\nIdentify what can move server-side, what must stay client-side, and suggest the split.',
        'category': 'frontend',
        'tags': ['react', 'typescript'],
        'tools': ['claude', 'github-copilot', 'gpt-4o'],
        'is_hot': True,
        'vote_count': 31,
        'copy_count': 87,
    },
    {
        'title': 'USE_EFFECT Debugger',
        'description': 'Systematic trace logic for identifying state closures and missing dependencies in complex React hook chains.',
        'content': 'Debug the following React useEffect hook. Identify:\n1. Stale closures\n2. Missing dependencies\n3. Infinite loop risks\n4. Memory leaks\n\n```tsx\n{{effect_code}}\n```\n\nComponent context: {{component_description}}',
        'category': 'debugging',
        'tags': ['react', 'typescript'],
        'tools': ['claude', 'github-copilot'],
        'vote_count': 28,
        'copy_count': 74,
    },
    {
        'title': 'Microservice Mapper',
        'description': 'Generates comprehensive Mermaid.js sequence diagrams from raw technical specifications.',
        'content': 'Given the following microservice description, generate a Mermaid.js sequence diagram:\n\n{{service_description}}\n\nInclude: service interactions, API calls, async events, error paths, and database operations.',
        'category': 'architecture',
        'tags': ['rest-api'],
        'tools': ['claude', 'chatgpt', 'gemini'],
        'vote_count': 25,
        'copy_count': 61,
    },
    {
        'title': 'Cypress E2E Generator',
        'description': 'Converts user story descriptions into bulletproof Cypress testing scripts.',
        'content': 'Generate a complete Cypress E2E test for the following user story:\n\n{{user_story}}\n\nInclude: setup/teardown, happy path, error scenarios, and accessibility assertions.',
        'category': 'testing',
        'tags': ['testing', 'typescript'],
        'tools': ['chatgpt', 'github-copilot', 'llama-3'],
        'vote_count': 22,
        'copy_count': 58,
    },
    {
        'title': 'REST to GraphQL',
        'description': 'Boilerplate generator for wrapping legacy REST endpoints into a modern GraphQL resolver architecture.',
        'content': 'Convert the following REST API endpoints to a GraphQL schema and resolvers:\n\n{{rest_endpoints}}\n\nGenerate: schema types, queries, mutations, and resolver functions in {{language}}.',
        'category': 'backend',
        'tags': ['graphql', 'rest-api'],
        'tools': ['claude', 'gpt-4o', 'mistral'],
        'vote_count': 19,
        'copy_count': 47,
    },
    {
        'title': 'Code Review Checklist',
        'description': 'Structured code review for pull requests following team standards.',
        'content': 'Perform a thorough code review of the following PR diff:\n\n```diff\n{{pr_diff}}\n```\n\nEvaluate: correctness, performance, security, test coverage, naming, and adherence to SOLID principles. Language: {{language}}.',
        'category': 'code-review',
        'tags': ['python', 'typescript'],
        'tools': ['claude', 'chatgpt', 'gemini', 'github-copilot'],
        'vote_count': 16,
        'copy_count': 42,
    },
]

for p in prompts_data:
    if not Prompt.objects.filter(title=p['title']).exists():
        prompt = Prompt.objects.create(
            title=p['title'],
            description=p['description'],
            content=p['content'],
            author=sarah,
            category=cats[p['category']],
            is_hot=p.get('is_hot', False),
            vote_count=p['vote_count'],
            copy_count=p['copy_count'],
        )
        for t in p.get('tags', []):
            if t in tags:
                prompt.tags.add(tags[t])
        for tool_slug in p.get('tools', []):
            if tool_slug in tools:
                prompt.compatible_tools.add(tools[tool_slug])
    else:
        # Update existing prompts with tool assignments
        prompt = Prompt.objects.get(title=p['title'])
        if not prompt.compatible_tools.exists():
            for tool_slug in p.get('tools', []):
                if tool_slug in tools:
                    prompt.compatible_tools.add(tools[tool_slug])

print(f'Created {len(prompts_data)} prompts')
print('\nSeed complete!')
print('API running at: http://localhost:8000/api/')
print('Admin: http://localhost:8000/admin/')
