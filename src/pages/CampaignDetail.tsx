import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Copy, Edit, Trash2, Plus, Loader2, Bot, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthLayout from "@/components/AuthLayout";
import AdScriptCard from "@/components/AdScriptCard";
import { api, Campaign, AdScript } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Validate campaign ID
  useEffect(() => {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid campaign ID');
      navigate('/campaigns');
    }
  }, [id, navigate]);

  const { 
    data: campaign, 
    isLoading: isCampaignLoading,
    error: campaignError
  } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.campaigns.get(id),
    enabled: !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  });
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [progress, setProgress] = useState(0);

  // Get available providers and models
  const providers = api.llmProviders.getProviders();
  const models = selectedProvider
    ? providers.find((p) => p.name === selectedProvider)?.models || []
    : [];
    
  // Social media platforms with "all" option
  const platforms = ["all", "instagram", "youtube", "facebook", "linkedin", "twitter"];

  // Handle campaign fetch error
  useEffect(() => {
    if (campaignError) {
      console.error("Error fetching campaign data:", campaignError);
      toast.error("Failed to load campaign details");
    }
  }, [campaignError]);

  // Fetch ad scripts
  const { 
    data: adScripts = [], 
    isLoading: isScriptsLoading,
    refetch: refetchAdScripts,
    error: scriptsError
  } = useQuery({
    queryKey: ['adScripts', id],
    queryFn: () => api.adScripts.getByCampaign(id),
    enabled: !!id && id !== 'NaN',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  // Handle scripts fetch error
  useEffect(() => {
    if (scriptsError) {
      console.error("Error fetching ad scripts:", scriptsError);
    }
  }, [scriptsError]);
  useEffect(() => {
    let timeoutId: number;
    if (isGenerating) {
      let currentStep = 0;
      
      const rotateSteps = () => {
        setLoadingStep(loadingSteps[currentStep]);
        setProgress(Math.min(100, (currentStep + 1) * (100 / loadingSteps.length)));
        currentStep = (currentStep + 1) % loadingSteps.length;
        timeoutId = window.setTimeout(rotateSteps, 2500);
      };
      
      rotateSteps();
    }
    
    return () => {
      window.clearTimeout(timeoutId);
      setLoadingStep("");
      setProgress(0);
    };
  }, [isGenerating]);

  const isLoading = isCampaignLoading || isScriptsLoading;

  const handleDeleteCampaign = async () => {
    if (!campaign) return;
    
    try {
      await api.campaigns.delete(campaign.id);
      toast.success("Campaign deleted successfully");
      navigate("/campaigns");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      // Toast handled by api.handleResponse
    }
  };

  const handleGenerateAdScript = async () => {
    if (!campaign || !selectedProvider || !selectedModel) return;
    
    try {
      setIsGenerating(true);
      await api.adScripts.generate(
        campaign.id,
        selectedProvider,
        selectedModel,
        selectedPlatform || undefined
      );
      
      // Refetch ad scripts after generating a new one
      await refetchAdScripts();
      
      setGenerateDialogOpen(false);
      toast.success("Ad script generated successfully");
    } catch (error) {
      console.error("Error generating ad script:", error);
      // Toast handled by api.handleResponse
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Campaign details copied to clipboard");
  };

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </AuthLayout>
    );
  }
  const loadingSteps = [
    "Scraping data from Reddit... 🔍",
    "Analyzing audience sentiment... 🧠",
    "Identifying pain points... 🎯",
    "Researching market trends... 📊",
    "Crafting persuasive content... ✍️",
    "Preparing final script... 🚀"
  ];

  if (!campaign) {
    return (
      <AuthLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Campaign not found</h2>
          <p className="text-muted-foreground mb-6">
            The campaign you're looking for doesn't exist or has been deleted.
          </p>
          <Link to="/campaigns">
            <Button>View all campaigns</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/campaigns")}
            className="mr-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to campaigns
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(JSON.stringify(campaign, null, 2))}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy details
          </Button>
          
          <Link to={`/campaigns/${campaign.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Campaign</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this campaign? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteCampaign}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {campaign.product_name}
          </h1>
          <div className="inline-block bg-primary/10 text-primary text-sm rounded-full px-3 py-1">
            {campaign.niche}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="lg:col-span-2 glass-card animate-slide-up">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Product Description
                </h3>
                <p>{campaign.product_description}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Target Audience
                </h3>
                <p>{campaign.target_audience}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Key Use Cases
                </h3>
                <p>{campaign.key_use_cases}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Campaign Goal
                </h3>
                <p>{campaign.campaign_goal}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle>Generate Ad Script</CardTitle>
              <CardDescription>
                Create a new ad script using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Ad Script
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Ad Script</DialogTitle>
                    <DialogDescription>
                      Select an AI provider, model, and platform to generate your ad script.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Provider
                      </label>
                      <Select
                        value={selectedProvider}
                        onValueChange={setSelectedProvider}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((provider) => {
                            const isAvailable = provider.name === "openai";
                            return (
                              <SelectItem 
                                key={provider.name} 
                                value={provider.name}
                                disabled={!isAvailable}
                                className={!isAvailable ? "opacity-60" : ""}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>
                                    {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                                  </span>
                                  {!isAvailable && (
                                    <Badge variant="outline" className="ml-2 bg-secondary/20 text-xs">
                                      Coming Soon
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Model
                      </label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                        disabled={!selectedProvider}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => {
                            const isAvailable = selectedProvider === "openai" && model === "gpt-4o";
                            return (
                              <SelectItem 
                                key={model} 
                                value={model}
                                disabled={!isAvailable}
                                className={!isAvailable ? "opacity-60" : ""}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{model}</span>
                                  {!isAvailable && (
                                    <Badge variant="outline" className="ml-2 bg-secondary/20 text-xs">
                                      Coming Soon
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Platform
                      </label>
                      <Select
                        value={selectedPlatform}
                        onValueChange={setSelectedPlatform}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((platform) => (
                            <SelectItem key={platform} value={platform}>
                              {platform === "all" 
                                ? "All Platforms" 
                                : platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateAdScript}
                      disabled={!selectedProvider || !selectedModel || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate"
                      )}
                    </Button>
                  </DialogFooter>
                  {isGenerating && (
                    <div className="mt-4">
                      <Alert className="bg-primary/5 border-primary/20">
                        <Bot className="h-5 w-5 text-primary animate-pulse" />
                        <AlertTitle className="text-primary mb-2">Our agents are working on your script</AlertTitle>
                        <AlertDescription className="text-sm">
                          <div className="mb-3">
                            {loadingStep}
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                            <Bell className="h-4 w-4" />
                            <p className="text-xs">
                              You can close this dialog. We'll notify you when your script is ready!
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-2xl font-bold tracking-tight">
            Ad Scripts
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({adScripts.length})
            </span>
          </h2>
          
          {adScripts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {adScripts.map((script) => (
                <AdScriptCard key={script.id} adScript={script} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <h3 className="text-lg font-medium mb-2">No ad scripts yet</h3>
                <p className="text-muted-foreground mb-6">
                  Generate your first ad script for this campaign
                </p>
                <Button onClick={() => setGenerateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Ad Script
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};

export default CampaignDetail;