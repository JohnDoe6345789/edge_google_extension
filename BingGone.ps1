# Set-EdgeGoogleOnlySearch.ps1
# Locks Edge to Google as the only search engine using the ManagedSearchEngines policy.

$regPath = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'

# 1. Ensure we're running as Administrator
$principal = New-Object Security.Principal.WindowsPrincipal `
    ([Security.Principal.WindowsIdentity]::GetCurrent())

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error 'This script must be run as Administrator (it writes to HKLM:\).'
    exit 1
}

Write-Host "Configuring Microsoft Edge search engines via policy..."


# 2. Create the Edge policy key if it does not exist
if (-not (Test-Path -Path $regPath)) {
    Write-Host "Creating policy key: $regPath"
    New-Item -Path $regPath -Force | Out-Null
}


# 3. Remove conflicting DefaultSearchProvider* policies so ManagedSearchEngines is not ignored
#    (ManagedSearchEngines is ignored if DefaultSearchProviderSearchURL is set)
$defaultSearchPolicyNames = @(
    'DefaultSearchProviderEnabled',
    'DefaultSearchProviderName',
    'DefaultSearchProviderSearchURL',
    'DefaultSearchProviderSuggestURL',
    'DefaultSearchProviderKeyword'
)

foreach ($name in $defaultSearchPolicyNames) {
    try {
        $existing = Get-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue
        if ($null -ne $existing) {
            Write-Host "Removing existing policy value: $name"
            Remove-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue
        }
    } catch {
        # Ignore errors here; it's just cleanup.
    }
}


# 4. Define ManagedSearchEngines JSON with only Google as default
#    See Microsoft 'ManagedSearchEngines' policy docs for schema.
#    https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/managedsearchengines
$json = @'
[
  {
    "is_default": true,
    "keyword": "google.com",
    "name": "Google",
    "search_url": "https://www.google.com/search?q={searchTerms}",
    "suggest_url": "https://www.google.com/complete/search?output=chrome&q={searchTerms}"
  }
]
'@

Write-Host "Writing ManagedSearchEngines policy with Google as the only engine..."

New-ItemProperty -Path $regPath `
                 -Name 'ManagedSearchEngines' `
                 -PropertyType String `
                 -Value $json `
                 -Force | Out-Null


# 5. Show the configured value
Write-Host "`nManagedSearchEngines policy is now:"
(Get-ItemProperty -Path $regPath -Name 'ManagedSearchEngines').ManagedSearchEngines
Write-Host "`nDone."

Write-Host "Restart Microsoft Edge, then check edge://policy to verify 'ManagedSearchEngines' is applied."
Write-Host "Edge's search engine list should now only show Google and be locked."
