from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('prompts', '0005_alter_collection_icon'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PromptShare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('prompt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shares', to='prompts.prompt')),
                ('shared_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shares_given', to=settings.AUTH_USER_MODEL)),
                ('shared_with', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shares_received', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('prompt', 'shared_with')},
            },
        ),
    ]
