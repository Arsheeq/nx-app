import React, { useEffect, useState } from "react";
import { useStore, getSteps } from "@/lib/store";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StepIndicator } from "@/components/StepIndicator";
import { CloudProviderSelector } from "@/components/CloudProviderCard";
import { ReportTypeSelector } from "@/components/ReportTypeCard";
import { ResourceTable } from "@/components/ResourceTable";
import { FrequencySelection } from "@/components/FrequencySelection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMonthName } from "@/lib/utils";

export default function Home() {
  const {
    currentStep,
    reportType,
    cloudProvider,
    nextStep,
    prevStep,
    awsAccessKeyId,
    awsSecretAccessKey,
    accountName,
    setAwsCredentials,
    azureClientId,
    azureClientSecret,
    azureTenantId,
    azureSubscriptionId,
    setAzureCredentials,
    setCloudAccountId,
    setResources,
    selectedResources,
    frequency,
    setFrequency,
    billingMonth,
    billingYear,
    setBillingPeriod,
    setReportId,
    reportId,
    reportStatus,
    setReportStatus,
    reportUrl,
    setReportUrl,
  } = useStore();

  const steps = getSteps(reportType);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formAccountName, setFormAccountName] = useState(accountName || "");

  // Form state for AWS credentials
  const [formAwsAccessKey, setFormAwsAccessKey] = useState(awsAccessKeyId);
  const [formAwsSecretKey, setFormAwsSecretKey] = useState(awsSecretAccessKey);

  // Form state for Azure credentials
  const [formAzureClientId, setFormAzureClientId] = useState(azureClientId);
  const [formAzureClientSecret, setFormAzureClientSecret] =
    useState(azureClientSecret);
  const [formAzureTenantId, setFormAzureTenantId] = useState(azureTenantId);
  const [formAzureSubscriptionId, setFormAzureSubscriptionId] =
    useState(azureSubscriptionId);

  // Form state for billing period
  const [formBillingMonth, setFormBillingMonth] = useState(
    billingMonth.toString(),
  );
  const [formBillingYear, setFormBillingYear] = useState(
    billingYear.toString(),
  );

  // Mutation for validating AWS credentials
  const validateAwsMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await apiRequest(
        "POST",
        "/api/aws/validate",
        credentials,
      );
      return response.json();
    },
    onSuccess: (data) => {
      setCloudAccountId(data.accountId);
      setResources(data.resources);
      nextStep();
      setSubmitting(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to validate AWS credentials");
      setSubmitting(false);
    },
  });

  // Mutation for validating Azure credentials
  const validateAzureMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await apiRequest(
        "POST",
        "/api/azure/validate",
        credentials,
      );
      return response.json();
    },
    onSuccess: (data) => {
      setCloudAccountId(data.accountId);
      setResources(data.resources);
      nextStep();
      setSubmitting(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to validate Azure credentials");
      setSubmitting(false);
    },
  });

  // Mutation for creating a report
  const createReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const response = await apiRequest("POST", "/api/reports", reportData);
      return response.json();
    },
    onSuccess: (data) => {
      setReportId(data.id);
      setReportStatus("pending");
      setSubmitting(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to create report");
      setSubmitting(false);
    },
  });

  // Query report status periodically if we have a report ID
  const reportStatusQuery = useQuery({
    queryKey: ["/api/reports", reportId, "status"],
    queryFn: async () => {
      if (!reportId) return null;
      const response = await fetch(`/api/reports/${reportId}/status`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch report status");
      }
      return response.json();
    },
    enabled: !!reportId && (reportStatus === "pending" || !reportStatus),
    refetchInterval: reportStatus === "pending" ? 2000 : false,
  });

  // Update report status from query
  useEffect(() => {
    if (reportStatusQuery.data) {
      setReportStatus(reportStatusQuery.data.status);
      if (reportStatusQuery.data.reportUrl) {
        setReportUrl(reportStatusQuery.data.reportUrl);
      }
    }
  }, [reportStatusQuery.data, setReportStatus, setReportUrl]);

  // Handle button clicks
  const handlePrevious = () => {
    prevStep();
    setError(null);
  };

  const handleNext = () => {
    const currentStepData = steps.find(
      (step, index) => index + 1 === currentStep,
    );

    if (currentStepData?.id === "credentials") {
      setSubmitting(true);
      setError(null);

      if (cloudProvider === "AWS") {
        // Validate AWS credentials
        setAwsCredentials(formAwsAccessKey, formAwsSecretKey, formAccountName);
        validateAwsMutation.mutate({
          accessKeyId: formAwsAccessKey,
          secretAccessKey: formAwsSecretKey,
          accountName: formAccountName,
        });
      } else {
        // Validate Azure credentials
        setAzureCredentials(
          formAzureClientId,
          formAzureClientSecret,
          formAzureTenantId,
          formAzureSubscriptionId,
          formAccountName,
        );
        validateAzureMutation.mutate({
          clientId: formAzureClientId,
          clientSecret: formAzureClientSecret,
          tenantId: formAzureTenantId,
          subscriptionId: formAzureSubscriptionId,
          accountName: formAccountName,
        });
      }
    } else if (currentStepData?.id === "select-period") {
      // Update billing period and go to next step
      const month = parseInt(formBillingMonth, 10);
      const year = parseInt(formBillingYear, 10);
      setBillingPeriod(month, year);
      nextStep();
    } else if (
      currentStepData?.id === "resources" ||
      currentStepData?.id === "frequency" ||
      currentStepData?.id === "report-type" ||
      currentStepData?.id === "cloud-provider"
    ) {
      // Just go to next step for these
      nextStep();
    } else if (currentStepData?.id === "generate") {
      setSubmitting(true);
      setError(null);

      // Format resources in the format expected by the Python backend: 'SERVICE_TYPE|INSTANCE_ID|REGION'
      const formattedResources = selectedResources.map((resourceId) => {
        // Find the full resource object to get its type and region
        const resource = useStore
          .getState()
          .resources.find((r) => r.resourceId === resourceId);
        if (resource) {
          return `${resource.type}|${resource.resourceId}|${resource.region}`;
        }
        return resourceId; // Fallback if not found, shouldn't happen
      });

      // Prepare report data based on report type
      const reportData = {
        cloudAccountId: 1, // This would be set from the state in real app
        type: reportType,
        resources: formattedResources,
        status: "pending",
        metadata: {
          provider: cloudProvider,
          credentials:
            cloudProvider === "AWS"
              ? {
                  accessKeyId: awsAccessKeyId,
                  secretAccessKey: awsSecretAccessKey,
                }
              : {
                  clientId: azureClientId,
                  clientSecret: azureClientSecret,
                  tenantId: azureTenantId,
                  subscriptionId: azureSubscriptionId,
                },
        },
      };

      // Add frequency for utilization reports
      if (reportType === "utilization") {
        reportData.frequency = frequency;
      }
      // Add month and year for billing reports
      else if (reportType === "billing") {
        reportData.metadata.month = billingMonth;
        reportData.metadata.year = billingYear;
      }

      // Create the report
      createReportMutation.mutate(reportData);
    } else {
      // Default behavior for other steps
      nextStep();
    }
  };

  const downloadReport = () => {
    if (reportId && reportStatus === "completed") {
      window.location.href = `/api/reports/${reportId}/download`;
    }
  };

  const getCurrentStepContent = () => {
    const currentStepData = steps.find(
      (step, index) => index + 1 === currentStep,
    );

    switch (currentStepData?.id) {
      case "cloud-provider":
        return (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
                Select Cloud Provider
              </h2>
              <p className="text-gray-500 mt-2">
                Choose the cloud provider you want to generate reports for
              </p>
            </div>
            <CloudProviderSelector />
          </section>
        );

      case "report-type":
        return (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
                Select Report Type
              </h2>
              <p className="text-gray-500 mt-2">
                Choose the type of report you want to generate
              </p>
            </div>
            <ReportTypeSelector />
          </section>
        );

      case "credentials":
        if (reportType === "billing" && currentStep === 3) {
          return (
            <section>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gradient">
                  Select Billing Period
                </h2>
                <p className="text-gray-500 mt-2">
                  Choose the year and month for your billing report
                </p>
              </div>

              <Card className="p-6 max-w-md mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="year-select">Year</Label>
                    <Select
                      value={formBillingYear}
                      onValueChange={setFormBillingYear}
                    >
                      <SelectTrigger id="year-select">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="month-select">Month</Label>
                    <Select
                      value={formBillingMonth}
                      onValueChange={setFormBillingMonth}
                    >
                      <SelectTrigger id="month-select">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="text-lg font-medium">
                    Selected Period: {getMonthName(parseInt(formBillingMonth))}{" "}
                    {formBillingYear}
                  </div>
                </div>
              </Card>

              <div className="text-center text-sm text-gray-500 mt-4">
                Billing data is available for years 2024 and 2025
              </div>
            </section>
          );
        }
        return (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
                Enter {cloudProvider} Credentials
              </h2>
              <p className="text-gray-500 mt-2">
                Provide your {cloudProvider} access credentials to scan for
                resources
              </p>
            </div>

            <Card className="p-6 max-w-xl mx-auto">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    type="text"
                    placeholder={
                      cloudProvider === "AWS"
                        ? "Enter AWS Account Name"
                        : "Enter Azure Account Name"
                    }
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                  />
                </div>

                {cloudProvider === "AWS" ? (
                  <>
                    <div>
                      <Label htmlFor="access-key">AWS Access Key ID</Label>
                      <Input
                        id="access-key"
                        type="text"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        className="font-mono"
                        value={formAwsAccessKey}
                        onChange={(e) => setFormAwsAccessKey(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="secret-key">AWS Secret Access Key</Label>
                      <Input
                        id="secret-key"
                        type="password"
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        className="font-mono"
                        value={formAwsSecretKey}
                        onChange={(e) => setFormAwsSecretKey(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="client-id">Azure Client ID</Label>
                      <Input
                        id="client-id"
                        type="text"
                        placeholder="11111111-1111-1111-1111-111111111111"
                        className="font-mono"
                        value={formAzureClientId}
                        onChange={(e) => setFormAzureClientId(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="client-secret">Azure Client Secret</Label>
                      <Input
                        id="client-secret"
                        type="password"
                        placeholder="Q~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono"
                        value={formAzureClientSecret}
                        onChange={(e) =>
                          setFormAzureClientSecret(e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="tenant-id">Tenant ID</Label>
                      <Input
                        id="tenant-id"
                        type="text"
                        placeholder="22222222-2222-2222-2222-222222222222"
                        className="font-mono"
                        value={formAzureTenantId}
                        onChange={(e) => setFormAzureTenantId(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="subscription-id">Subscription ID</Label>
                      <Input
                        id="subscription-id"
                        type="text"
                        placeholder="33333333-3333-3333-3333-333333333333"
                        className="font-mono"
                        value={formAzureSubscriptionId}
                        onChange={(e) =>
                          setFormAzureSubscriptionId(e.target.value)
                        }
                      />
                    </div>
                  </>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-2 text-sm text-gray-500">
                  <p>
                    Your credentials are only used to scan resources and are
                    never stored.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        );

      case "select-period":
        return (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gradient">
                Select Billing Period
              </h2>
              <p className="text-gray-500 mt-2">
                Choose the year and month for your billing report
              </p>
            </div>

            <Card className="p-6 max-w-md mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="year-select">Year</Label>
                  <Select
                    value={formBillingYear}
                    onValueChange={setFormBillingYear}
                  >
                    <SelectTrigger id="year-select">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="month-select">Month</Label>
                  <Select
                    value={formBillingMonth}
                    onValueChange={setFormBillingMonth}
                  >
                    <SelectTrigger id="month-select">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="text-lg font-medium">
                  Selected Period: {getMonthName(parseInt(formBillingMonth))}{" "}
                  {formBillingYear}
                </div>
              </div>
            </Card>

            <div className="text-center text-sm text-gray-500 mt-4">
              Billing data is available for years 2024 and 2025
            </div>
          </section>
        );

      case "resources":
        return (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
                Select Resources
              </h2>
              <p className="text-gray-500 mt-2">
                Choose the resources to include in your report
              </p>
            </div>
            <ResourceTable />
          </section>
        );

      case "frequency":
        return <FrequencySelection />;

      case "generate":
        return (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
                Generate Report
              </h2>
              <p className="text-gray-500 mt-2">
                Review your selections and generate your report
              </p>
            </div>

            <Card className="p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">
                Report Configuration
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Cloud Provider:</span>
                  <span>{cloudProvider}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Report Type:</span>
                  <span>
                    {reportType === "utilization"
                      ? "Utilization Report"
                      : "Billing Report"}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Account Name:</span>
                  <span>{accountName}</span>
                </div>

                {reportType === "utilization" ? (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Time Period:</span>
                    <span>
                      {frequency === "daily"
                        ? "Daily (24 hours)"
                        : "Weekly (7 days)"}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Billing Period:</span>
                    <span>
                      {getMonthName(billingMonth)} {billingYear}
                    </span>
                  </div>
                )}

                {reportType === "utilization" && (
                  <div className="py-2">
                    <div className="font-medium mb-2">Selected Resources:</div>
                    <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                      {selectedResources.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedResources.map((resourceId) => {
                            const resource = useStore
                              .getState()
                              .resources.find(
                                (r) => r.resourceId === resourceId,
                              );
                            return (
                              <li key={resourceId} className="text-sm">
                                {resourceId} ({resource?.name || "Unknown"}) -{" "}
                                {resource?.region || "Unknown"}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No resources selected
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    {reportType === "utilization" ? (
                      <p className="text-sm text-blue-800">
                        This report will include CPU, memory, and disk
                        utilization metrics for the selected resources.
                        Generating the report may take a few moments depending
                        on the number of resources selected.
                      </p>
                    ) : (
                      <p className="text-sm text-blue-800">
                        This report will include detailed billing information
                        for {getMonthName(billingMonth)} {billingYear}.
                        Generating the report may take a few moments.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                {!reportId ? (
                  <Button
                    className="bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90 hover:opacity-100"
                    disabled={submitting}
                    onClick={handleNext}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Report...
                      </>
                    ) : (
                      <>Generate & Download Report</>
                    )}
                  </Button>
                ) : reportStatus === "pending" ? (
                  <Button
                    disabled
                    className="bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90"
                  >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </Button>
                ) : reportStatus === "completed" ? (
                  <Button
                    className="bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90 hover:opacity-100"
                    onClick={downloadReport}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleNext}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Failed, Try Again
                  </Button>
                )}
              </div>
            </Card>
          </section>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow py-8">
        <div className="max-w-[1000px] mx-auto">
          <StepIndicator />

          <div className="mt-8 bg-white rounded-lg border shadow-sm">
            {getCurrentStepContent()}

            {/* Navigation Buttons */}
            {currentStep !== 1 && reportStatus !== "pending" && (
              <div className="flex justify-between mt-10">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={submitting}
                >
                  Previous
                </Button>

                {/* Only show Next button if not on credentials, generate step, or if we have a report already */}
                {steps[currentStep - 1]?.id !== "credentials" &&
                  steps[currentStep - 1]?.id !== "generate" &&
                  !reportId && (
                    <Button
                      className="button-black-bubble"
                      onClick={handleNext}
                      disabled={
                        submitting ||
                        (steps[currentStep - 1]?.id === "resources" &&
                          selectedResources.length === 0)
                      }
                    >
                      Next
                    </Button>
                  )}

                {/* Special case for credentials step */}
                {steps[currentStep - 1]?.id === "credentials" && !reportId && (
                  <Button
                    className="bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90 hover:opacity-100"
                    onClick={handleNext}
                    disabled={
                      submitting ||
                      (cloudProvider === "AWS"
                        ? !formAwsAccessKey || !formAwsSecretKey
                        : !formAzureClientId ||
                          !formAzureClientSecret ||
                          !formAzureTenantId ||
                          !formAzureSubscriptionId)
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Validate & Scan Resources"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
