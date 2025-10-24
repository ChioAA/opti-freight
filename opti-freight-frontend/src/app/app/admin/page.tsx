"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOptiFreight } from "@/hooks/use-opti-freight";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AdminPage() {
  const { fetchSales, sales, isLoading } = useOptiFreight();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [saleInfo, setSaleInfo] = useState<any>(null);

  // Auto-inicializar venta al cargar la página
  useEffect(() => {
    handleInitSale();
  }, []);

  const handleInitSale = async () => {
    setIsInitializing(true);

    try {
      const response = await fetch('/api/init-sale', {
        method: 'POST',
      });

      const data = await response.json();

      console.log('📊 API Response:', data);

      if (data.success) {
        setSaleInfo(data);
        toast({
          title: "Sale Ready!",
          description: data.message,
          duration: 7000,
        });

        // Refresh sales list
        await fetchSales();
      } else {
        console.error('❌ API Error Details:', {
          error: data.error,
          details: data.details,
          errorType: data.errorType,
          logs: data.logs,
        });
        toast({
          variant: "destructive",
          title: "Failed to initialize sale",
          description: data.details || data.error || "Unknown error",
        });
      }
    } catch (error: any) {
      console.error('Error initializing sale:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to initialize sale",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Sale initialization status</p>
      </div>

      {isInitializing && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Initializing Sale...</AlertTitle>
          <AlertDescription>
            Please wait while the sale is being initialized automatically
          </AlertDescription>
        </Alert>
      )}

      {saleInfo && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Sale Ready!</AlertTitle>
          <AlertDescription>
            {saleInfo.message}
            <br />
            <span className="font-mono text-xs">Sale Address: {saleInfo.saleAddress}</span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sale Configuration</CardTitle>
          <CardDescription>
            Automatic sale initialization of 1000 tokens at 1.2 SOL each
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Total Tokens</p>
              <p className="text-2xl font-bold">1,000</p>
            </div>
            <div>
              <p className="font-medium">Price per Token</p>
              <p className="text-2xl font-bold">1.2 SOL</p>
            </div>
            <div>
              <p className="font-medium">Total Value</p>
              <p className="text-2xl font-bold">1,200 SOL</p>
            </div>
          </div>

          {saleInfo?.sale && (
            <div className="p-4 border rounded-lg space-y-2">
              <p className="font-medium">Sale Status</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Sold: {saleInfo.sale.sold} / {saleInfo.sale.total}</div>
                <div>Active: {saleInfo.sale.active ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          <Button
            onClick={handleInitSale}
            disabled={isInitializing}
            variant="outline"
            className="w-full"
          >
            {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isInitializing ? "Checking..." : "Refresh Sale Status"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sales</CardTitle>
          <CardDescription>
            List of all sales in the smart contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sales.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No sales found</AlertTitle>
              <AlertDescription>
                Click "Initialize Sale" to create your first sale
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale.publicKey.toString()} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Sale PDA</p>
                    <p className="font-mono text-sm">{sale.publicKey.toString().slice(0, 20)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Sold</p>
                    <p className="font-bold">{sale.account.sold} / {sale.account.total}</p>
                  </div>
                  <div>
                    {sale.account.active ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center text-muted-foreground">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Inactive
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
