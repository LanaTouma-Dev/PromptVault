import { Routes } from '@angular/router';
import { LibraryComponent } from './pages/library/library.component';
import { PromptDetailComponent } from './pages/prompt-detail/prompt-detail.component';
import { CollectionDetailComponent } from './pages/collection-detail/collection-detail.component';
import { MyPromptsComponent } from './pages/my-prompts/my-prompts.component';

export const routes: Routes = [
  { path: '',                component: LibraryComponent },
  { path: 'prompt/:id',      component: PromptDetailComponent },
  { path: 'collection/:id',  component: CollectionDetailComponent },
  { path: 'my-prompts',      component: MyPromptsComponent },
  { path: '**',              redirectTo: '' },
];
