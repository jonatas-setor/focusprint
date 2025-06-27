'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { LoadingButton, TableSkeleton, InlineLoading } from '@/components/ui/loading-skeletons';
import { Globe, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';

interface RegionalPrice {
  currency: string;
  price: number;
  formatted_price: string;
}

interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

interface RegionalPricingManagerProps {
  planId?: string;
}

export default function RegionalPricingManager({ planId }: RegionalPricingManagerProps) {
  const [loading, setLoading] = useState(false);
  const [regionalPrices, setRegionalPrices] = useState<RegionalPrice[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['BRL', 'USD', 'EUR']);
  
  // New currency form
  const [newCurrency, setNewCurrency] = useState('');
  const [newRates, setNewRates] = useState<Array<{from: string, to: string, rate: string}>>([]);

  useEffect(() => {
    loadSupportedCurrencies();
    if (planId) {
      loadRegionalPricing();
    }
  }, [planId]);

  const loadSupportedCurrencies = async () => {
    try {
      const response = await fetch('/api/admin/plans/currencies');
      const result = await response.json();

      if (result.success) {
        setSupportedCurrencies(result.data.supported_currencies);
        setExchangeRates(result.data.exchange_rates);
      } else {
        toast.error('Failed to load supported currencies');
      }
    } catch (error) {
      toast.error('Error loading currencies');
    }
  };

  const loadRegionalPricing = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/plans/regional-pricing?planId=${planId}&currencies=${selectedCurrencies.join(',')}`
      );
      const result = await response.json();

      if (result.success) {
        setRegionalPrices(result.data.regional_prices);
      } else {
        toast.error('Failed to load regional pricing');
      }
    } catch (error) {
      toast.error('Error loading regional pricing');
    } finally {
      setLoading(false);
    }
  };

  const updateExchangeRates = async (rates: Array<{from: string, to: string, rate: number}>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/plans/regional-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Updated ${rates.length} exchange rates`);
        await loadSupportedCurrencies();
        if (planId) {
          await loadRegionalPricing();
        }
      } else {
        toast.error('Failed to update exchange rates');
      }
    } catch (error) {
      toast.error('Error updating exchange rates');
    } finally {
      setLoading(false);
    }
  };

  const addNewCurrency = async () => {
    if (!newCurrency || newRates.length === 0) {
      toast.error('Currency code and exchange rates are required');
      return;
    }

    const rates = newRates.map(rate => ({
      from: rate.from,
      to: rate.to,
      rate: parseFloat(rate.rate)
    }));

    setLoading(true);
    try {
      const response = await fetch('/api/admin/plans/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurrency, rates })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Added support for ${newCurrency}`);
        setNewCurrency('');
        setNewRates([]);
        await loadSupportedCurrencies();
      } else {
        toast.error('Failed to add currency support');
      }
    } catch (error) {
      toast.error('Error adding currency');
    } finally {
      setLoading(false);
    }
  };

  const addNewRate = () => {
    setNewRates([...newRates, { from: newCurrency, to: 'BRL', rate: '' }]);
  };

  const updateNewRate = (index: number, field: string, value: string) => {
    const updated = [...newRates];
    updated[index] = { ...updated[index], [field]: value };
    setNewRates(updated);
  };

  const removeNewRate = (index: number) => {
    setNewRates(newRates.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Pricing Management
          </CardTitle>
          <CardDescription>
            Manage multi-currency pricing and exchange rates for global markets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pricing">Regional Pricing</TabsTrigger>
              <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
              <TabsTrigger value="currencies">Add Currency</TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Select Currencies</Label>
                  <Select 
                    value={selectedCurrencies.join(',')} 
                    onValueChange={(value) => setSelectedCurrencies(value.split(','))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedCurrencies.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <LoadingButton
                  onClick={loadRegionalPricing}
                  loading={loading}
                  disabled={!planId}
                  className="mt-6 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Prices
                </LoadingButton>
              </div>

              {loading && planId && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="text-right space-y-2">
                            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && planId && regionalPrices.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {regionalPrices.map((price) => (
                    <Card key={price.currency}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{price.currency}</Badge>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{price.formatted_price}</div>
                            <div className="text-sm text-muted-foreground">
                              Raw: {price.price}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && !planId && (
                <div className="text-center py-8 text-muted-foreground">
                  Select a plan to view regional pricing
                </div>
              )}

              {!loading && planId && regionalPrices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No regional pricing data available for this plan
                </div>
              )}
            </TabsContent>

            <TabsContent value="rates" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Current Exchange Rates</h3>
                <LoadingButton
                  onClick={loadSupportedCurrencies}
                  loading={loading}
                  variant="outline"
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </LoadingButton>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchangeRates.map((rate, index) => (
                    <TableRow key={index}>
                      <TableCell>{rate.from_currency}</TableCell>
                      <TableCell>{rate.to_currency}</TableCell>
                      <TableCell>{rate.rate}</TableCell>
                      <TableCell>
                        {new Date(rate.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="currencies" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newCurrency">Currency Code (3 letters)</Label>
                  <Input
                    id="newCurrency"
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                    placeholder="e.g., JPY"
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Exchange Rates</Label>
                    <Button onClick={addNewRate} variant="outline" size="sm">
                      Add Rate
                    </Button>
                  </div>

                  {newRates.map((rate, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select 
                        value={rate.from} 
                        onValueChange={(value) => updateNewRate(index, 'from', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={newCurrency}>{newCurrency}</SelectItem>
                          {supportedCurrencies.map(currency => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <span>→</span>
                      
                      <Select 
                        value={rate.to} 
                        onValueChange={(value) => updateNewRate(index, 'to', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={newCurrency}>{newCurrency}</SelectItem>
                          {supportedCurrencies.map(currency => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="0.000001"
                        value={rate.rate}
                        onChange={(e) => updateNewRate(index, 'rate', e.target.value)}
                        placeholder="Rate"
                        className="w-32"
                      />

                      <Button 
                        onClick={() => removeNewRate(index)} 
                        variant="outline" 
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={addNewCurrency} 
                  disabled={loading || !newCurrency || newRates.length === 0}
                  className="w-full"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Add Currency Support
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
