// Import a function
import { greet } from './main'

// Make it accessible on the window object
(window as any).greet = greet
