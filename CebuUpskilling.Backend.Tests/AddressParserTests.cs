using CebuUpskilling.Backend.Services;

namespace CebuUpskilling.Backend.Tests;

public class AddressParserTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Parse_EmptyAddress_ReturnsAllNull(string? address)
    {
        var result = AddressParser.Parse(address);

        Assert.Null(result.Street);
        Assert.Null(result.City);
        Assert.Null(result.Province);
        Assert.Null(result.ZipCode);
        Assert.Null(result.Country);
        Assert.True(result.IsEmpty);
    }

    [Fact]
    public void Parse_FullPhilippineAddress_SplitsIntoParts()
    {
        var result = AddressParser.Parse("Unit 5, 88 Magallanes St, Cebu City, Cebu 6000, Philippines");

        Assert.Equal("Unit 5, 88 Magallanes St", result.Street);
        Assert.Equal("Cebu City", result.City);
        Assert.Equal("Cebu", result.Province);
        Assert.Equal("6000", result.ZipCode);
        Assert.Equal("Philippines", result.Country);
    }

    [Fact]
    public void Parse_AddressWithRegionAndShortCountry_SplitsIntoParts()
    {
        var result = AddressParser.Parse("123 Main St, Makati City, Metro Manila 1200, PH");

        Assert.Equal("123 Main St", result.Street);
        Assert.Equal("Makati City", result.City);
        Assert.Equal("Metro Manila", result.Province);
        Assert.Equal("1200", result.ZipCode);
        Assert.Equal("PH", result.Country);
    }

    [Fact]
    public void Parse_StreetAndProvinceOnly_SplitsIntoParts()
    {
        var result = AddressParser.Parse("Kalayaan Ave, Laguna");

        Assert.Equal("Kalayaan Ave", result.Street);
        Assert.Null(result.City);
        Assert.Equal("Laguna", result.Province);
        Assert.Null(result.ZipCode);
        Assert.Equal("Philippines", result.Country);
    }

    [Fact]
    public void Parse_StreetAndCityOnly_SplitsIntoParts()
    {
        var result = AddressParser.Parse("456 Oak Ave, Mandaluyong, Philippines");

        Assert.Equal("456 Oak Ave", result.Street);
        Assert.Equal("Mandaluyong", result.City);
        Assert.Null(result.Province);
        Assert.Null(result.ZipCode);
        Assert.Equal("Philippines", result.Country);
    }

    [Fact]
    public void Parse_CityAndProvinceWithSameName_SplitsIntoParts()
    {
        var result = AddressParser.Parse("Cebu City, Cebu");

        Assert.Null(result.Street);
        Assert.Equal("Cebu City", result.City);
        Assert.Equal("Cebu", result.Province);
        Assert.Equal("Philippines", result.Country);
    }

    [Fact]
    public void Parse_SingleLine_IsTreatedAsStreet()
    {
        var result = AddressParser.Parse("123 Main St");

        Assert.Equal("123 Main St", result.Street);
        Assert.Null(result.City);
        Assert.Null(result.Province);
        Assert.Null(result.Country);
    }

    [Fact]
    public void Parse_AddressWithBarangayAndPostal_SplitsIntoParts()
    {
        var result = AddressParser.Parse("Zone 3, Poblacion, Tagbilaran City, Bohol 6300");

        Assert.Equal("Zone 3, Poblacion", result.Street);
        Assert.Equal("Tagbilaran City", result.City);
        Assert.Equal("Bohol", result.Province);
        Assert.Equal("6300", result.ZipCode);
        Assert.Equal("Philippines", result.Country);
    }
}
