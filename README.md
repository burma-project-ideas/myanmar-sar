# လက်ကလေး — မြန်မာဗျည်းအက္ခရာ ရေးလေ့ကျင့်ခန်း

**လက်ကလေး** သည် မိဘနှင့် ကလေးအတူ မြန်မာဗျည်း ၃၃ လုံးကို မြှားပြထားသော ပုံများကြည့်ပြီး လက်ညှိုး၊ stylus သို့မဟုတ် mouse ဖြင့် လိုက်ရေးလေ့ကျင့်နိုင်သည့် .NET 10 Blazor WebAssembly app ဖြစ်သည်။ Backend နှင့် user account မလိုဘဲ browser ထဲတွင်သာ အလုပ်လုပ်သည်။

## Overview

App ၏ အဓိကရည်ရွယ်ချက်မှာ ကလေးတစ်ယောက်ကို စာလုံးပုံစံကြည့်ခြင်း၊ လေထဲတွင် အရင်ရေးကြည့်ခြင်း၊ ပြီးမှ သတ်မှတ်ထားသော လမ်းကြောင်းအတွင်း လိုက်ရေးခြင်းဟူသော ရိုးရှင်းသည့် သင်ယူမှုအစီအစဉ်ဖြင့် မြန်မာဗျည်းများကို လေ့ကျင့်ပေးရန်ဖြစ်သည်။

အဓိကလုပ်ဆောင်ချက်များမှာ—

- က မှ အ အထိ မြန်မာဗျည်း ၃၃ လုံး ရွေးချယ်လေ့ကျင့်နိုင်ခြင်း
- အက္ခရာတစ်လုံးစီအတွက် ရေးသားပုံနှင့် မြှားပြလမ်းကြောင်း ပါရှိခြင်း
- Touch, stylus နှင့် mouse input များကို Pointer Events ဖြင့် တစ်မျိုးတည်း ကိုင်တွယ်ခြင်း
- သတ်မှတ်ထားသော အက္ခရာလမ်းကြောင်းအတွင်း ရေးသည့် stroke ကိုသာ canvas ပေါ်တွင် ပြသခြင်း
- နောက်ဆုံး stroke ကို ပြန်ဖျက်ခြင်းနှင့် ရေးထားသမျှ အားလုံးရှင်းခြင်း
- ရှေ့/နောက် အက္ခရာသို့ သွားခြင်းနှင့် ပြီးဆုံးမှု progress ကြည့်ခြင်း
- ပြီးဆုံးထားသော အက္ခရာများကို browser `localStorage` တွင် မှတ်သားထားခြင်း
- ဖုန်း၊ tablet နှင့် desktop အရွယ်အစားများအတွက် responsive layout နှင့် accessibility support ပါရှိခြင်း

## အသုံးပြုသူ Workflow

1. App ဖွင့်သည့်အခါ ယခင်ပြီးဆုံးထားသော အက္ခရာစာရင်းကို browser မှ ပြန်ဖတ်သည်။
2. အပေါ်ဘက် အက္ခရာတန်းမှ လေ့ကျင့်လိုသော ဗျည်းကို ရွေးသည်။
3. ပုံတွင် ပြထားသော မြှားနှင့် ပန်းရောင်လမ်းကြောင်းကို ကြည့်သည်။
4. လက်ညှိုး၊ stylus သို့မဟုတ် mouse ဖြင့် အက္ခရာလမ်းကြောင်းအတွင်း လိုက်ရေးသည်။ လမ်းကြောင်းအပြင်ဘက် အပိုင်းများကို canvas က ဖြတ်တောက်ပေးသည်။
5. လိုအပ်ပါက **ပြန်ဖျက်** ဖြင့် နောက်ဆုံး stroke ကို ဖျက်နိုင်ပြီး **အားလုံးရှင်း** ဖြင့် လက်ရှိအက္ခရာ၏ stroke အားလုံးကို ရှင်းနိုင်သည်။
6. လေ့ကျင့်ပြီးပါက **လေ့ကျင့်ပြီးပြီလို့ မှတ်မယ်** ကို နှိပ်သည်။ Progress နှင့် အစိမ်းရောင် check mark ကို ချက်ချင်းပြောင်းပြီး browser ထဲတွင် သိမ်းပေးသည်။
7. **ရှေ့တစ်လုံး** သို့မဟုတ် **နောက်တစ်လုံး** ဖြင့် ဆက်လေ့ကျင့်သည်။

> ပြီးဆုံးမှု progress သည် page ပြန်ဖွင့်သော်လည်း မပျောက်ပါ။ ရေးထားသော canvas stroke များသည် လက်ရှိ page session အတွင်း အက္ခရာပြောင်းပြီး ပြန်လာသည့်အခါသာ ရှိနေပြီး page refresh သို့မဟုတ် tab ပိတ်ပြီးနောက် ပျောက်သွားမည်။

## System Workflow

```text
wwwroot/index.html
        │ Blazor WebAssembly ကို စတင်သည်
        ▼
Program.cs ──► App.razor router ──► Pages/Home.razor
                                           │
                   ┌───────────────────────┼────────────────────────┐
                   ▼                       ▼                        ▼
        letters/letter-NN.jpg       JS interop: drawing      JS interop: progress
                                            │                        │
                                            ▼                        ▼
                                  Canvas + Pointer Events     browser localStorage
```

အလုပ်လုပ်ပုံအသေးစိတ်မှာ—

1. `Home.razor` က အက္ခရာ ၃၃ လုံး၊ လက်ရှိရွေးထားသော အက္ခရာနှင့် ပြီးဆုံးမှု state ကို ထိန်းသည်။
2. အက္ခရာရွေးချယ်သည့်အခါ သက်ဆိုင်ရာ `letter-NN.jpg` worksheet ကို ပြပြီး JavaScript drawing setup ကို JS interop ဖြင့် ခေါ်သည်။
3. `app.js` က worksheet ပုံရှိ မည်းနက်ပြီး အရောင်မစွက်သော အက္ခရာအစိတ်အပိုင်းများကို စစ်ပြီး ရေးနိုင်သည့် mask တည်ဆောက်သည်။ ကလေး၏ လက်ချောင်းအတွက် tolerance အနည်းငယ် ထည့်ပေးထားသည်။
4. Pointer coordinates နှင့် pen pressure ကို canvas အရွယ်အစားနှင့်မသက်ဆိုင်သည့် normalized values အဖြစ် သိမ်းသည်။ ထို့ကြောင့် screen resize ဖြစ်သည့်အခါ stroke များကို ပြန်ဆွဲနိုင်သည်။
5. Stroke များကို အနီရောင်ဖြင့် render လုပ်ပြီး worksheet mask နှင့် clip လုပ်သဖြင့် သတ်မှတ်လမ်းကြောင်းအတွင်း အပိုင်းများသာ မြင်ရသည်။
6. ပြီးဆုံးမှုကို `myanmarzar.completed` key ဖြင့် `localStorage` ထဲ သိမ်းပြီး app ပြန်ဖွင့်သည့်အခါ Blazor state ထဲ ပြန်တင်သည်။

## နည်းပညာများ

- [.NET 10](https://dotnet.microsoft.com/) / C#
- Blazor WebAssembly
- Razor components
- HTML Canvas, Pointer Events နှင့် Resize Observer
- JavaScript interop နှင့် browser `localStorage`
- Responsive CSS နှင့် reduced-motion, keyboard focus, ARIA support

## စတင်အသုံးပြုခြင်း

လိုအပ်ချက်များ—

- .NET 10 SDK
- Canvas နှင့် Pointer Events ကို support လုပ်သော ခေတ်မီ browser

Repository root မှ အောက်ပါ command များကို run ပါ။

```powershell
dotnet restore MyanmarZar.slnx
dotnet run --project MyanmarZar/MyanmarZar.csproj
```

Terminal တွင် ပြထားသော local address ကို browser ဖြင့် ဖွင့်ပါ။ Default HTTP launch profile သည် `http://localhost:5014` ကို အသုံးပြုသည်။ HTTPS profile ဖြင့် စမ်းလိုပါက—

```powershell
dotnet run --project MyanmarZar/MyanmarZar.csproj --launch-profile https
```

## Build နှင့် Publish

Release build စစ်ရန်—

```powershell
dotnet build MyanmarZar.slnx --configuration Release
```

Static deployment အတွက် publish လုပ်ရန်—

```powershell
dotnet publish MyanmarZar/MyanmarZar.csproj --configuration Release
```

Publish ပြီးသော static site files များကို `MyanmarZar/bin/Release/net10.0/publish/wwwroot/` တွင် ရရှိမည်။ ထို folder ကို static web host တစ်ခုသို့ deploy လုပ်နိုင်သည်။

## Project Structure

```text
myanmarzar/
├── MyanmarZar.slnx
├── README.md
└── MyanmarZar/
    ├── App.razor                    # App router
    ├── Program.cs                   # WebAssembly startup နှင့် DI
    ├── Pages/Home.razor             # UI, အက္ခရာ data နှင့် component state
    ├── Layout/MainLayout.razor      # Main page layout
    ├── wwwroot/index.html           # Browser host page
    ├── wwwroot/css/app.css          # Responsive visual design
    ├── wwwroot/js/app.js            # Drawing engine နှင့် localStorage
    └── wwwroot/images/letters/      # အက္ခရာ worksheet ၃၃ ပုံ
```

## Development Workflow

ပုံမှန်ပြင်ဆင်မှုအလိုက် အဓိက file များမှာ—

| ပြင်ဆင်လိုသောအပိုင်း | File |
| --- | --- |
| စာမျက်နှာ content, အက္ခရာစာရင်း, navigation, progress | `MyanmarZar/Pages/Home.razor` |
| Drawing mask, pointer input, undo/clear, browser storage | `MyanmarZar/wwwroot/js/app.js` |
| Color, spacing, responsive layout, animation | `MyanmarZar/wwwroot/css/app.css` |
| Worksheet ပုံများ | `MyanmarZar/wwwroot/images/letters/letter-NN.jpg` |
| App title, metadata, loading/error UI | `MyanmarZar/wwwroot/index.html` |

Worksheet ပုံတစ်ပုံ အစားထိုးရာတွင်—

1. `letter-01.jpg` မှ `letter-33.jpg` naming အတိုင်း မှန်ကန်သော နံပါတ်ဖြင့် ပုံကို ထည့်ပါ။
2. ရေးရမည့် အက္ခရာလမ်းကို မည်းရောင်/neutral dark color ဖြင့် ထင်ရှားစွာထားပါ။ Drawing mask သည် worksheet pixels မှ လမ်းကြောင်းကို အလိုအလျောက်ဖော်ထုတ်သောကြောင့် guide arrow နှင့် အခြား decoration များကို လမ်းကြောင်းနှင့် အရောင်ကွဲအောင်ထားပါ။
3. `Home.razor` ရှိ `Letters` entry ၏ နံပါတ်၊ အက္ခရာနှင့် အမည်တို့ကို ပုံနှင့် တိုက်စစ်ပါ။
4. Mouse သာမက touch/stylus ဖြင့်ပါ လမ်းကြောင်း၊ resize, undo နှင့် clear တို့ကို စမ်းပါ။
5. နောက်ဆုံးတွင် Release build ကို run ပြီး compile error မရှိကြောင်း စစ်ပါ။

အက္ခရာအသစ် ထပ်တိုးမည်ဆိုပါက `Letters` စာရင်းအပြင် UI ရှိ `၃၃` count စာသားများနှင့် progress bar ၏ maximum value ကိုပါ တစ်ပြိုင်နက် ပြင်ရန်လိုသည်။

## State နှင့် Data

| State | သိမ်းသည့်နေရာ | သက်တမ်း |
| --- | --- | --- |
| လက်ရှိရွေးထားသော အက္ခရာ | Blazor component memory | Page refresh မတိုင်မီ |
| အက္ခရာတစ်လုံးစီ၏ drawing strokes | JavaScript `Map` | လက်ရှိ page session အတွင်း |
| လေ့ကျင့်ပြီးသော အက္ခရာ indices | Browser `localStorage` | Browser data မရှင်းမချင်း |

App တွင် backend database, login သို့မဟုတ် cloud sync မရှိသဖြင့် completion data သည် အသုံးပြုနေသော browser နှင့် origin တစ်ခုတည်းတွင်သာ ရှိသည်။ Private browsing သို့မဟုတ် storage ပိတ်ထားသော environment တွင် lesson ကို ဆက်သုံးနိုင်သော်လည်း progress ကို နောက်တစ်ကြိမ်အတွက် သိမ်းနိုင်မည်မဟုတ်ပါ။

## Verification Checklist

- `dotnet build MyanmarZar.slnx --configuration Release` အောင်မြင်ရမည်။
- အက္ခရာ ၃၃ လုံးလုံး၏ worksheet ပုံများ မှန်ကန်စွာ ပေါ်ရမည်။
- Touch, stylus နှင့် mouse ဖြင့် drawing ပြုလုပ်နိုင်ရမည်။
- Undo, clear, ရှေ့/နောက် navigation နှင့် completion toggle အလုပ်လုပ်ရမည်။
- Page refresh ပြီးနောက် completion progress ပြန်ပေါ်ရမည်။
- Mobile နှင့် desktop အရွယ်အစားနှစ်မျိုးလုံးတွင် အသုံးပြုနိုင်ရမည်။

လက်ရှိ repository တွင် automated test project မပါသေးသောကြောင့် Release build နှင့် အထက်ပါ browser checks များသည် အဓိက verification workflow ဖြစ်သည်။
