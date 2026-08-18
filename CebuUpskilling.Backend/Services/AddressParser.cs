using System.Text.RegularExpressions;

namespace CebuUpskilling.Backend.Services;

public sealed record AddressParts(
    string? Street,
    string? City,
    string? Province,
    string? ZipCode,
    string? Country)
{
    public bool IsEmpty => Street is null && City is null && Province is null && ZipCode is null && Country is null;
}

public static partial class AddressParser
{
    private const string DefaultCountry = "Philippines";

    private static readonly HashSet<string> CountryNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "PH", "PHL", "RP", "PHILIPPINES",
        "US", "USA", "U.S.", "U.S.A.", "UNITED STATES", "AMERICA",
        "CA", "CANADA",
        "AU", "AUSTRALIA",
        "UK", "GB", "GBR", "UNITED KINGDOM",
        "JP", "JAPAN",
        "CN", "CHINA",
        "SG", "SINGAPORE",
        "MY", "MALAYSIA",
        "ID", "INDONESIA",
        "TH", "THAILAND",
        "VN", "VIETNAM",
        "KR", "SOUTH KOREA",
        "AE", "UAE", "UNITED ARAB EMIRATES",
    };

    private static readonly HashSet<string> ProvinceNames = new(StringComparer.OrdinalIgnoreCase)
    {
        // Regions / special units
        "METRO MANILA", "NCR", "NATIONAL CAPITAL REGION",
        "CAR", "CORDILLERA ADMINISTRATIVE REGION",
        "ILOCOS", "ILOCOS REGION", "REGION I", "REGION 1",
        "CAGAYAN VALLEY", "REGION II", "REGION 2",
        "CENTRAL LUZON", "REGION III", "REGION 3",
        "CALABARZON", "REGION IV-A", "REGION IVA",
        "MIMAROPA", "SOUTHERN TAGALOG", "REGION IV-B", "REGION IVB",
        "BICOL", "BICOL REGION", "REGION V", "REGION 5",
        "WESTERN VISAYAS", "REGION VI", "REGION 6",
        "CENTRAL VISAYAS", "REGION VII", "REGION 7",
        "EASTERN VISAYAS", "REGION VIII", "REGION 8",
        "ZAMBOANGA PENINSULA", "REGION IX", "REGION 9",
        "NORTHERN MINDANAO", "REGION X", "REGION 10",
        "DAVAO", "DAVAO REGION", "REGION XI", "REGION 11",
        "SOCCSKSARGEN", "REGION XII", "REGION 12",
        "CARAGA", "REGION XIII", "REGION 13",
        "BARMM", "BANGSAMORO",
        // Provinces
        "ABRA", "AGUSAN DEL NORTE", "AGUSAN DEL SUR", "AKLAN", "ALBAY",
        "ANTIQUE", "APAYAO", "AURORA", "BASILAN", "BATAAN", "BATANES",
        "BATANGAS", "BENGUET", "BILIRAN", "BOHOL", "BUKIDNON", "BULACAN",
        "CAGAYAN", "CAMARINES NORTE", "CAMARINES SUR", "CAMIGUIN", "CAPIZ",
        "CATANDUANES", "CAVITE", "CEBU", "COTABATO", "DAVAO DE ORO",
        "DAVAO DEL NORTE", "DAVAO DEL SUR", "DAVAO OCCIDENTAL", "DAVAO ORIENTAL",
        "DINAGAT ISLANDS", "EASTERN SAMAR", "GUIMARAS", "IFUGAO", "ILOCOS NORTE",
        "ILOCOS SUR", "ILOILO", "ISABELA", "KALINGA", "LA UNION", "LAGUNA",
        "LANAO DEL NORTE", "LANAO DEL SUR", "LEYTE", "MAGUINDANAO DEL NORTE",
        "MAGUINDANAO DEL SUR", "MARINDUQUE", "MASBATE", "MISAMIS OCCIDENTAL",
        "MISAMIS ORIENTAL", "MOUNTAIN PROVINCE", "NEGROS OCCIDENTAL",
        "NEGROS ORIENTAL", "NORTHERN SAMAR", "NUEVA ECIJA", "NUEVA VIZCAYA",
        "OCCIDENTAL MINDORO", "ORIENTAL MINDORO", "PALAWAN", "PAMPANGA",
        "PANGASINAN", "QUEZON", "QUIRINO", "RIZAL", "ROMBLON", "SAMAR",
        "SARANGANI", "SIQUIJOR", "SORSOGON", "SOUTH COTABATO", "SOUTHERN LEYTE",
        "SULTAN KUDARAT", "SULU", "SURIGAO DEL NORTE", "SURIGAO DEL SUR",
        "TARLAC", "TAWI-TAWI", "ZAMBALES", "ZAMBOANGA DEL NORTE",
        "ZAMBOANGA DEL SUR", "ZAMBOANGA SIBUGAY",
    };

    [GeneratedRegex(@"\b(\d{4})\b")]
    private static partial Regex ZipCodeRegex();

    public static AddressParts Parse(string? rawAddress)
    {
        if (string.IsNullOrWhiteSpace(rawAddress))
        {
            return new AddressParts(null, null, null, null, null);
        }

        var parts = rawAddress
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .Where(p => p.Length > 0)
            .ToList();

        if (parts.Count == 0)
        {
            return new AddressParts(null, null, null, null, null);
        }

        string? zipCode = ExtractZipCode(parts);
        string? country = ExtractCountry(parts);

        if (parts.Count == 0)
        {
            return new AddressParts(null, null, null, zipCode, country);
        }

        string? street = null;
        string? city = null;
        string? province = null;

        int provinceIndex = FindLastProvinceIndex(parts);
        if (provinceIndex >= 0)
        {
            province = parts[provinceIndex];
            if (provinceIndex >= 1)
            {
                string candidate = parts[provinceIndex - 1];
                if (LooksLikeStreet(candidate))
                {
                    street = string.Join(", ", parts.Take(provinceIndex));
                }
                else
                {
                    city = candidate;
                    if (provinceIndex >= 2)
                    {
                        street = string.Join(", ", parts.Take(provinceIndex - 1));
                    }
                }
            }
        }
        else if (parts.Count == 1)
        {
            street = parts[0];
        }
        else if (parts.Count == 2)
        {
            street = parts[0];
            city = parts[1];
        }
        else
        {
            street = string.Join(", ", parts.Take(parts.Count - 2));
            city = parts[^2];
            province = parts[^1];
        }

        return new AddressParts(
            NullIfBlank(street),
            NullIfBlank(city),
            NullIfBlank(province),
            NullIfBlank(zipCode),
            country ?? DefaultCountryIfCebuAddress(rawAddress, province));
    }

    private static string? ExtractZipCode(List<string> parts)
    {
        for (int i = parts.Count - 1; i >= 0; i--)
        {
            var match = ZipCodeRegex().Match(parts[i]);
            if (!match.Success)
            {
                continue;
            }

            string zip = match.Groups[1].Value;
            string remaining = parts[i].Remove(match.Index, match.Length).Trim();
            if (remaining.Length > 0)
            {
                parts[i] = remaining;
            }
            else
            {
                parts.RemoveAt(i);
            }

            return zip;
        }

        return null;
    }

    private static string? ExtractCountry(List<string> parts)
    {
        if (parts.Count == 0)
        {
            return null;
        }

        string? last = parts[^1];
        if (CountryNames.Contains(last))
        {
            parts.RemoveAt(parts.Count - 1);
            return last;
        }

        return null;
    }

    private static int FindLastProvinceIndex(List<string> parts)
    {
        int found = -1;
        for (int i = 0; i < parts.Count; i++)
        {
            if (ProvinceNames.Contains(parts[i]))
            {
                found = i;
            }
        }

        return found;
    }

    private static string? DefaultCountryIfCebuAddress(string rawAddress, string? province)
    {
        if (province is not null && ProvinceNames.Contains(province))
        {
            return DefaultCountry;
        }

        return rawAddress.Contains("Cebu", StringComparison.OrdinalIgnoreCase) ? DefaultCountry : null;
    }

    private static bool LooksLikeStreet(string value)
    {
        string upper = value.ToUpperInvariant();
        if (upper.Any(char.IsDigit))
        {
            return true;
        }

        return StreetSuffixes.Any(upper.EndsWith);
    }

    private static readonly string[] StreetSuffixes =
    {
        " ST", " STREET", " AVE", " AVE.", " AVENUE", " BLVD", " BLVD.", " ROAD",
        " RD", " RD.", " DR", " DR.", " DRIVE", " LANE", " LN", " LN.",
        " HIGHWAY", " HWY", " PARKWAY", " PKWY", " WAY", " COURT", " CT",
        " BRGY", " BRGY.", " BARANGAY", " PUROK", " SITIO", " ZONE", " PHASE",
        " BLK", " BLK.", " BLOCK", " UNIT", " FLOOR", " BLDG", " BLDG.",
        " BUILDING", " VILLAGE", " SUBD", " SUBD.", " SUBDIVISION", " COMPOUND",
    };

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
