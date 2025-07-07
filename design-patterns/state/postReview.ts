/* ============================================================================
 * 1. State interface
 * ---------------------------------------------------------------------------- */
interface PostState {
  name: string;
  edit(content: string): void;
  submitForReview(): void;
  approve(): void;
  archive(): void;
}

/* ============================================================================
 * 2. Context (the “post” object)
 * ---------------------------------------------------------------------------- */
class BlogPost {
  private state: PostState;
  public content = '';

  constructor() {
    this.state = new DraftState(this);      // initial state
  }

  /* ––––– API delegated to the current state ––––– */
  edit(text: string) { this.state.edit(text); }
  submitForReview() { this.state.submitForReview(); }
  approve() { this.state.approve(); }
  archive() { this.state.archive(); }

  /* ––––– Internal helper ––––– */
  changeState(newState: PostState) {
    console.log(`>> State change: ${this.state.name} → ${newState.name}`);
    this.state = newState;
  }
}

/* ============================================================================
 * 3. Concrete states
 * ---------------------------------------------------------------------------- */
class DraftState implements PostState {
  readonly name = 'Draft';
  constructor(private post: BlogPost) { }
  edit(text: string) { this.post.content = text; }
  submitForReview() { this.post.changeState(new ReviewState(this.post)); }
  approve() { console.log('Draft can’t be approved. Submit first.'); }
  archive() { console.log('Draft can’t be archived.'); }
}

class ReviewState implements PostState {
  readonly name = 'Review';
  constructor(private post: BlogPost) { }
  edit(_) { console.log('Locked. Reviewers must reject to edit.'); }
  submitForReview() { console.log('Already in review.'); }
  approve() { this.post.changeState(new PublishedState(this.post)); }
  archive() { console.log('Review post can’t be archived.'); }
}

class PublishedState implements PostState {
  readonly name = 'Published';
  constructor(private post: BlogPost) { }
  edit(_) { console.log('Live content is read-only.'); }
  submitForReview() { console.log('Already published.'); }
  approve() { console.log('Already approved.'); }
  archive() { this.post.changeState(new ArchivedState(this.post)); }
}

class ArchivedState implements PostState {
  readonly name = 'Archived';
  constructor(private post: BlogPost) { }
  edit(_) { console.log('Archived content is immutable.'); }
  submitForReview() { console.log('Archived content cannot be reviewed.'); }
  approve() { console.log('Archived content cannot be approved.'); }
  archive() { console.log('Already archived.'); }
}

/* ============================================================================
 * 4. Demo
 * ---------------------------------------------------------------------------- */
const post = new BlogPost();

post.edit('📝 First draft');
post.submitForReview();  // Draft → Review
post.edit('Try to change');   // locked
post.approve();          // Review → Published
post.archive();          // Published → Archived
post.archive();          // already archived
