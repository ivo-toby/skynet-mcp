/**
 * Task Store singleton for managing delayed execution tasks
 */
import { DelayedTask } from './types.js';

/**
 * TaskStore class provides a singleton for managing delayed tasks
 */
class TaskStore {
  private static instance: TaskStore;
  private tasks: Map<string, DelayedTask>;

  private constructor() {
    this.tasks = new Map<string, DelayedTask>();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TaskStore {
    if (!TaskStore.instance) {
      TaskStore.instance = new TaskStore();
    }
    return TaskStore.instance;
  }

  /**
   * Create a new in-progress task
   * 
   * @param taskId The unique ID for the task
   * @returns The created task
   */
  public createTask(taskId: string): DelayedTask {
    const task: DelayedTask = {
      taskId,
      status: 'in-progress',
    };
    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Get a task by ID
   * 
   * @param taskId The ID of the task to retrieve
   * @returns The task or undefined if not found
   */
  public getTask(taskId: string): DelayedTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Update a task with completed status
   * 
   * @param taskId The ID of the task to update
   * @param response The response data to store
   */
  public completeTask(taskId: string, response: unknown): void {
    this.tasks.set(taskId, {
      taskId,
      status: 'completed',
      response,
    });
  }

  /**
   * Update a task with error status
   * 
   * @param taskId The ID of the task to update
   * @param error The error message
   */
  public failTask(taskId: string, error: string): void {
    this.tasks.set(taskId, {
      taskId,
      status: 'error',
      error,
    });
  }
}

export const taskStore = TaskStore.getInstance();
