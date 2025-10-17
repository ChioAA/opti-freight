"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOptiFreight } from "@/hooks/use-opti-freight";
import { useToast } from "@/hooks/use-toast";
import { useSolanaWallet } from "@/hooks/use-solana-wallet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AdminPage() {
  const { initSale, fetchSales, sales, isLoading } = useOptiFreight();
  const { publicKey, connected } = useSolanaWallet();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitSale = async () => {
    if (!connected || !publicKey) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first",
      });
      return;
    }

    setIsInitializing(true);

    try {
      const result = await initSale();

      if (result.success) {
        toast({
          title: "Sale Initialized!",
          description: `Successfully created sale for 1000 tokens. TX: ${result.signature}`,
          duration: 7000,
        });

        // Refresh sales list
        await fetchSales();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to initialize sale",
          description: result.error || "Unknown error",
        });
      }
    } catch (error: any) {
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
        <p className="text-muted-foreground">Manage sales and marketplace</p>
      </div>

      {!connected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>
            Please connect your treasury wallet to manage sales
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Initialize New Sale</CardTitle>
          <CardDescription>
            Create a new sale of 1000 tokens at $200 each
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
              <p className="text-2xl font-bold">$200</p>
            </div>
            <div>
              <p className="font-medium">Total Value</p>
              <p className="text-2xl font-bold">$200,000</p>
            </div>
          </div>

          <Button
            onClick={handleInitSale}
            disabled={!connected || isInitializing}
            className="w-full"
          >
            {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isInitializing ? "Initializing..." : "Initialize Sale"}
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
