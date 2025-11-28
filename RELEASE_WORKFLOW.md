# iOS Release Workflow (Expo + Xcode + TestFlight/App Store)

## Begriffe

- **`version`**
  - Feld in `app.config.ts`
  - Wird im App Store als **App-Version** angezeigt (z.B. `1.0.6`)

- **`ios.buildNumber`**
  - Feld in `app.config.ts` → `ios.buildNumber: "26"`
  - Interne Build-Nummer für Apple (muss **immer steigen**, Nutzer sehen sie nicht)

---

## 1. Config anpassen

In `app.config.ts`:

```ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  version: "1.0.6", // App-Version (Optional, siehe unten)
  ios: {
    // ...
    buildNumber: "26", // Bei jedem Upload erhöhen
    // ...
  },
});
```

### Varianten

#### Nur neuer TestFlight-Build, gleiche App-Store-Version

- `version` gleich lassen
- Nur `ios.buildNumber` um +1 erhöhen

#### Neue App-Store-Version releasen (z.B. 1.0.5 → 1.0.6)

- `version` erhöhen (`"1.0.5"` → `"1.0.6"`)
- `ios.buildNumber` ebenfalls um +1 erhöhen

---

## 2. Native iOS-Projekt synchronisieren

Im Projektroot:

```bash
# (Optional) sicherstellen, dass du auf der Prod-Variante bist
# APP_VARIANT=production

npx expo prebuild --platform ios
npx pod-install
```

---

## 3. In Xcode archivieren

```bash
xed ios
```

In Xcode:

1. Target deiner App wählen
2. Tab **General**:
   - **Version** = `version` aus der Config
   - **Build** = `ios.buildNumber`
3. Oben als Device: **Any iOS Device (arm64)** wählen
4. Menü: **Product → Archive**

---

## 4. Build zu App Store Connect / TestFlight hochladen

Im **Organizer** (öffnet sich nach dem Archive-Build, sonst **Window → Organizer**):

1. Neues Archive auswählen
2. **Distribute App**
3. **App Store Connect** → **Upload**
4. Dialoge mit den Standardoptionen durchklicken

---

## 5. In App Store Connect

### TestFlight

1. Warten bis Status **Ready to Test**
2. Interne Tester hinzufügen und in TestFlight-App installieren

### App Store Release (neue Version)

1. Unter **App Store** → **iOS App** neue Version (z.B. `1.0.6`) anlegen/öffnen
2. Den hochgeladenen Build auswählen
3. Metadaten/Release Notes ausfüllen
4. **Submit for Review**
