
import { useState } from "react";
import { Copy, Edit2, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AdScript, api } from "@/services/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AdScriptCardProps {
  adScript: AdScript;
  onUpdate?: () => void;
}

const AdScriptCard = ({ adScript, onUpdate }: AdScriptCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editContent, setEditContent] = useState(adScript.content);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(adScript.content);
    toast.success("Ad script copied to clipboard");
  };

  const handleEdit = async () => {
    try {
      setIsLoading(true);
      await api.adScripts.update(String(adScript.id), editContent);
      toast.success("Ad script updated successfully");
      setIsEditing(false);
      // Invalidate and refetch ad scripts
      queryClient.invalidateQueries({
        queryKey: ['adScripts', adScript.campaign_id]
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error updating ad script:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      if (!adScript.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adScript.id.toString())) {
        throw new Error('Invalid script ID format');
      }
      await api.adScripts.delete(adScript.id.toString());
      toast.success("Ad script deleted successfully");
      // Invalidate and refetch ad scripts
      await queryClient.invalidateQueries({
        queryKey: ['adScripts', adScript.campaign_id],
        exact: true
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting ad script:", error);
      // Ensure we're passing a string message to toast.error
      if (error instanceof Error) {
        toast.error(error.message);
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        toast.error(String(error.message));
      } else {
        toast.error("Failed to delete ad script");
      }
    } finally {
      setIsLoading(false);
      setIsDeleting(false);
    }
  };

  // Process markdown content by replacing common markdown patterns
  const processMarkdown = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br />'); // Line breaks
  };

  return (
    <Card className="glass-card transition-all duration-300 hover:shadow-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>
            {adScript.provider.charAt(0).toUpperCase() + adScript.provider.slice(1)} / {adScript.model}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(adScript.created_at)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div 
          className="whitespace-pre-line text-sm"
          dangerouslySetInnerHTML={{
            __html: expanded 
              ? processMarkdown(adScript.content)
              : processMarkdown(adScript.content.substring(0, 150) + (adScript.content.length > 150 ? "..." : ""))
          }}
        />
        {adScript.content.length > 150 && (
          <Button
            variant="link"
            onClick={() => setExpanded(!expanded)}
            className="p-0 h-auto text-xs text-primary mt-2"
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Ad Script</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this ad script? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleting(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardFooter>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ad Script</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={10}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdScriptCard;
