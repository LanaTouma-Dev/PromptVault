import { Routes } from '@angular/router';
import { LibraryComponent } from './pages/library/library.component';
import { PromptDetailComponent } from './pages/prompt-detail/prompt-detail.component';

export const routes: Routes = [
  { path: '',          component: LibraryComponent },
  { path: 'prompt/:id', component: PromptDetailComponent },
  { path: '**',        redirectTo: '' },
];
