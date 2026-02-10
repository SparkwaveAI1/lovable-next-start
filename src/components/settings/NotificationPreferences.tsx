import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Mail, MessageSquare, Smartphone, RotateCcw } from "lucide-react";
import { useNotificationPreferences, NotificationPreferences as NotificationPrefs } from "@/hooks/useNotificationPreferences";

interface NotificationPreferencesProps {
  businessId?: string;
}

export function NotificationPreferences({ businessId }: NotificationPreferencesProps) {
  const {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    resetToDefaults,
  } = useNotificationPreferences(businessId);

  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleSelectChange = (key: keyof NotificationPrefs, value: string) => {
    updatePreferences({ [key]: value });
  };

  if (!businessId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Select a business above to configure notification settings
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how and when you receive notifications from Sparkwave
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading preferences...</span>
          </div>
        ) : (
          <>
            {/* Email Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Email Notifications</h3>
              </div>
              
              <div className="ml-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled" className="text-base">
                      Enable Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates and alerts via email
                    </p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={preferences.email_enabled}
                    onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
                    disabled={isSaving}
                  />
                </div>

                {preferences.email_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="digest-frequency">Digest Frequency</Label>
                    <Select
                      value={preferences.email_digest_frequency}
                      onValueChange={(value) => handleSelectChange('email_digest_frequency', value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger id="digest-frequency" className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">
                          <div className="flex items-center gap-2">
                            Real-time
                            <Badge variant="secondary" className="text-xs">Instant</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Digest</SelectItem>
                        <SelectItem value="never">
                          <span className="text-muted-foreground">Never</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {preferences.email_digest_frequency === 'realtime' && 
                        'Receive emails immediately when events occur'}
                      {preferences.email_digest_frequency === 'daily' && 
                        'Receive a summary email once per day at 9 AM'}
                      {preferences.email_digest_frequency === 'weekly' && 
                        'Receive a summary email every Monday morning'}
                      {preferences.email_digest_frequency === 'never' && 
                        'Email notifications are disabled'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* SMS Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">SMS Notifications</h3>
              </div>
              
              <div className="ml-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-enabled" className="text-base">
                      Enable SMS Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive critical alerts via text message
                    </p>
                  </div>
                  <Switch
                    id="sms-enabled"
                    checked={preferences.sms_enabled}
                    onCheckedChange={(checked) => handleToggle('sms_enabled', checked)}
                    disabled={isSaving}
                  />
                </div>
                {preferences.sms_enabled && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
                    ⚠️ SMS notifications may incur additional charges. Only critical alerts will be sent.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Push Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Push Notifications</h3>
              </div>
              
              <div className="ml-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-enabled" className="text-base">
                      Enable Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications for real-time updates
                    </p>
                  </div>
                  <Switch
                    id="push-enabled"
                    checked={preferences.push_enabled}
                    onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
                    disabled={isSaving}
                  />
                </div>
                {preferences.push_enabled && (
                  <p className="text-xs text-muted-foreground mt-2">
                    You may need to allow notifications in your browser settings
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Alert Threshold */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Alert Threshold</h3>
              </div>
              
              <div className="ml-6 space-y-2">
                <Label htmlFor="alert-threshold">Minimum Alert Priority</Label>
                <Select
                  value={preferences.alert_threshold}
                  onValueChange={(value) => handleSelectChange('alert_threshold', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="alert-threshold" className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select threshold" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        All Notifications
                        <Badge variant="outline" className="text-xs">Verbose</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">High Priority Only</SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        Critical Only
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Filter which notifications you receive based on their priority level
                </p>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
