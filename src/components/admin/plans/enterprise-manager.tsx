'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-skeletons';
import { Building2, Crown, DollarSign, FileText, Users, Calendar, Shield } from 'lucide-react';

interface EnterpriseQuote {
  id: string;
  contact_email: string;
  company_name: string;
  estimated_users: number;
  estimated_projects: number;
  storage_requirements_gb: number;
  required_features: string[];
  compliance_requirements: string[];
  deployment_type: string;
  contract_duration_months: number;
  estimated_monthly_price: number;
  setup_fee: number;
  status: string;
  valid_until: string;
  created_at: string;
  notes: string;
}

interface EnterprisePlan {
  id: string;
  code: string;
  name: string;
  description: string;
  features: Record<string, boolean>;
  limits: Record<string, any>;
}

export default function EnterpriseManager() {
  const [loading, setLoading] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [enterprisePlan, setEnterprisePlan] = useState<EnterprisePlan | null>(null);
  const [quotes, setQuotes] = useState<EnterpriseQuote[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  
  // Quote form data
  const [quoteForm, setQuoteForm] = useState({
    contact_email: '',
    company_name: '',
    estimated_users: '',
    estimated_projects: '',
    storage_requirements_gb: '',
    required_features: [] as string[],
    compliance_requirements: [] as string[],
    deployment_type: 'cloud',
    contract_duration_months: '12',
    notes: ''
  });

  useEffect(() => {
    loadEnterpriseData();
    loadQuotes();
  }, []);

  const loadEnterpriseData = async () => {
    try {
      const response = await fetch('/api/admin/plans/enterprise?action=plan');
      const result = await response.json();

      if (result.success) {
        setEnterprisePlan(result.data.plan);
      } else {
        toast.error('Failed to load enterprise plan');
      }
    } catch (error) {
      toast.error('Error loading enterprise data');
    }
  };

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/plans/enterprise?action=quotes');
      const result = await response.json();

      if (result.success) {
        setQuotes(result.data.quotes);
      } else {
        toast.error('Failed to load quotes');
      }
    } catch (error) {
      toast.error('Error loading quotes');
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async () => {
    setSubmittingQuote(true);
    try {
      const response = await fetch('/api/admin/plans/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_quote',
          ...quoteForm,
          estimated_users: parseInt(quoteForm.estimated_users) || 0,
          estimated_projects: parseInt(quoteForm.estimated_projects) || 0,
          storage_requirements_gb: parseInt(quoteForm.storage_requirements_gb) || 100,
          contract_duration_months: parseInt(quoteForm.contract_duration_months) || 12
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Enterprise quote created successfully');
        setShowQuoteForm(false);
        setQuoteForm({
          contact_email: '',
          company_name: '',
          estimated_users: '',
          estimated_projects: '',
          storage_requirements_gb: '',
          required_features: [],
          compliance_requirements: [],
          deployment_type: 'cloud',
          contract_duration_months: '12',
          notes: ''
        });
        await loadQuotes();
      } else {
        toast.error('Failed to create quote');
      }
    } catch (error) {
      toast.error('Error creating quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: string, notes?: string) => {
    try {
      setUpdatingQuoteId(quoteId);
      const response = await fetch('/api/admin/plans/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_quote_status',
          quote_id: quoteId,
          status,
          notes
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Quote status updated to ${status}`);
        await loadQuotes();
      } else {
        toast.error('Failed to update quote status');
      }
    } catch (error) {
      toast.error('Error updating quote');
    } finally {
      setUpdatingQuoteId(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'negotiating': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Enterprise Plan Management
          </CardTitle>
          <CardDescription>
            Manage enterprise plan features, custom quotes, and client negotiations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {enterprisePlan && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Plan Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-lg font-semibold">{enterprisePlan.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm text-muted-foreground">{enterprisePlan.description}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Pricing Model</Label>
                        <Badge variant="outline" className="ml-2">Custom Pricing</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Unlimited Users</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Unlimited Projects</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm">SSO & SAML</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="text-sm">24/7 Support</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">R$ 2.000+</div>
                      <div className="text-sm text-muted-foreground">Base Monthly Price</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">R$ 5.000+</div>
                      <div className="text-sm text-muted-foreground">Setup Fee</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">99.99%</div>
                      <div className="text-sm text-muted-foreground">SLA Uptime</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Enterprise Quotes</h3>
                <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      New Quote
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Enterprise Quote</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Company Name *</Label>
                          <Input
                            value={quoteForm.company_name}
                            onChange={(e) => setQuoteForm({...quoteForm, company_name: e.target.value})}
                            placeholder="Company Inc."
                          />
                        </div>
                        <div>
                          <Label>Contact Email *</Label>
                          <Input
                            type="email"
                            value={quoteForm.contact_email}
                            onChange={(e) => setQuoteForm({...quoteForm, contact_email: e.target.value})}
                            placeholder="contact@company.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Estimated Users *</Label>
                          <Input
                            type="number"
                            value={quoteForm.estimated_users}
                            onChange={(e) => setQuoteForm({...quoteForm, estimated_users: e.target.value})}
                            placeholder="100"
                          />
                        </div>
                        <div>
                          <Label>Estimated Projects</Label>
                          <Input
                            type="number"
                            value={quoteForm.estimated_projects}
                            onChange={(e) => setQuoteForm({...quoteForm, estimated_projects: e.target.value})}
                            placeholder="50"
                          />
                        </div>
                        <div>
                          <Label>Storage (GB)</Label>
                          <Input
                            type="number"
                            value={quoteForm.storage_requirements_gb}
                            onChange={(e) => setQuoteForm({...quoteForm, storage_requirements_gb: e.target.value})}
                            placeholder="500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Deployment Type</Label>
                          <Select 
                            value={quoteForm.deployment_type} 
                            onValueChange={(value) => setQuoteForm({...quoteForm, deployment_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cloud">Cloud</SelectItem>
                              <SelectItem value="on_premise">On-Premise</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Contract Duration (months)</Label>
                          <Select 
                            value={quoteForm.contract_duration_months} 
                            onValueChange={(value) => setQuoteForm({...quoteForm, contract_duration_months: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12 months</SelectItem>
                              <SelectItem value="24">24 months</SelectItem>
                              <SelectItem value="36">36 months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={quoteForm.notes}
                          onChange={(e) => setQuoteForm({...quoteForm, notes: e.target.value})}
                          placeholder="Additional requirements or notes..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowQuoteForm(false)}>
                        Cancel
                      </Button>
                      <LoadingButton
                        onClick={createQuote}
                        loading={submittingQuote}
                        disabled={submittingQuote}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Create Quote
                      </LoadingButton>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Est. Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.company_name}</TableCell>
                      <TableCell>{quote.contact_email}</TableCell>
                      <TableCell>{quote.estimated_users}</TableCell>
                      <TableCell>{formatPrice(quote.estimated_monthly_price)}/mês</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(quote.status)}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <LoadingButton
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuoteStatus(quote.id, 'sent')}
                            loading={updatingQuoteId === quote.id}
                            disabled={updatingQuoteId === quote.id}
                          >
                            Send
                          </LoadingButton>
                          <LoadingButton
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuoteStatus(quote.id, 'approved')}
                            loading={updatingQuoteId === quote.id}
                            disabled={updatingQuoteId === quote.id}
                          >
                            Approve
                          </LoadingButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {quotes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No enterprise quotes found. Create the first one to get started.
                </div>
              )}
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              {enterprisePlan && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Security Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(enterprisePlan.features)
                          .filter(([key]) => key.includes('security') || key.includes('sso') || key.includes('saml') || key.includes('audit'))
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                              <Badge variant={value ? 'default' : 'secondary'}>
                                {value ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Support & SLA</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Support Level</span>
                          <Badge>24/7 Dedicated</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">SLA Uptime</span>
                          <Badge>99.99%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Response Time</span>
                          <Badge>15 minutes</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
