import { Routes } from '@angular/router';
import { LibraryComponent } from './pages/library/library.component';
import { PromptDetailComponent } from './pages/prompt-detail/prompt-detail.component';
import { CollectionDetailComponent } from './pages/collection-detail/collection-detail.component';
import { MyPromptsComponent } from './pages/my-prompts/my-prompts.component';
import { MyForksComponent } from './pages/my-forks/my-forks.component';
import { SharedWithMeComponent } from './pages/shared-with-me/shared-with-me.component';

export const routes: Routes = [
  { path: '',                component: LibraryComponent },
  { path: 'prompt/:id',      component: PromptDetailComponent },
  { path: 'collection/:id',  component: CollectionDetailComponent },
  { path: 'my-prompts',      component: MyPromptsComponent },
  { path: 'my-forks',        component: MyForksComponent },
  { path: 'shared-with-me',  component: SharedWithMeComponent },
  { path: '**',              redirectTo: '' },
];
