#!/bin/bash

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       🚀 RELEASE CHECKLISTE 🚀        ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Bitte prüfe folgende Punkte vor dem Release:${NC}"
echo ""
echo -e "  ${YELLOW}[1]${NC} ${BOLD}Versionsnummer erhöht?${NC}"
echo -e "      ${DIM}→ app.config.ts → version${NC}"
echo ""
echo -e "  ${YELLOW}[2]${NC} ${BOLD}Changelog aktualisiert?${NC}"
echo -e "      ${DIM}→ Neue Features & Fixes dokumentiert${NC}"
echo ""
echo -e "  ${YELLOW}[3]${NC} ${BOLD}Roadmap geprüft?${NC}"
echo -e "      ${DIM}→ Kleine Fixes die noch mit ins Release könnten?${NC}"
echo ""
echo -e "${CYAN}──────────────────────────────────────────${NC}"
echo ""
echo -ne "${BOLD}Alle Punkte erledigt? ${NC}${DIM}[y/N]:${NC} "
read answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${GREEN}✓ Starte EAS Build + Submit für Production...${NC}"
  echo ""
  eas build --profile production --platform ios --auto-submit
else
  echo ""
  echo -e "${RED}✗ Release abgebrochen.${NC}"
  exit 1
fi
