export interface UserActivity {
  userId: string;
  activityType: 'page_view' | 'button_click' | 'app_start' | 'ai_interaction' | 'error';
  details?: any;
}

export const activityService = {
  async logActivity(activity: UserActivity): Promise<boolean> {
    try {
      const response = await fetch('/api/user-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
      return response.ok;
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  },

  async logPageView(userId: string, pageName: string) {
    return this.logActivity({
      userId,
      activityType: 'page_view',
      details: { page: pageName }
    });
  },

  async logButtonClick(userId: string, buttonId: string, details?: any) {
    return this.logActivity({
      userId,
      activityType: 'button_click',
      details: { button: buttonId, ...details }
    });
  }
};
