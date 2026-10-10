# ORGANIZATION ACCESS & GITHUB REPOSITORIES

## 1. Primary Organization: Artometrics
- **Repository URL**: [https://github.com/Artometrics/dawn](https://github.com/Artometrics/dawn)
- **Primary Branch**: `main`
- **Current Remote Configuration**:
  ```bash
  git remote -v
  # origin  https://github.com/Artometrics/dawn.git (fetch)
  # origin  https://github.com/Artometrics/dawn.git (push)
  ```

---

## 2. Personal Account: `kylesmcauliffe`
- **GitHub Handle**: `kylesmcauliffe`
- **Ownership & Forking**: Can maintain a personal fork or mirror of Dawn if needed:
  ```bash
  git remote add personal https://github.com/kylesmcauliffe/dawn.git
  git push personal main
  ```

---

## 3. External Organizations & Theme Repos

### A. Lexington Themes
- **Access Type**: Organization / Private Repo invitations
- **URL**: `https://github.com/lexington-themes` or specific theme repos
- **Authentication**: When accessing Lexington Themes, verify membership under your GitHub Settings -> Organizations (`https://github.com/settings/organizations`).
- If cloning via CLI:
  ```bash
  gh repo clone lexington-themes/<theme-name>
  ```

### B. Code with Antonio
- **Access Type**: Organization member / course repository access
- **URL**: `https://github.com/codewithantonio`
- To verify invitations:
  ```bash
  gh api user/memberships/orgs/codewithantonio
  ```

---

## 4. Re-Authenticating or Switching GitHub Accounts
If GitHub CLI or Git credentials need refreshing:
```bash
# Check current logged-in identity
gh auth status

# Re-authenticate with all organization permissions
gh auth login --web --scopes "repo,read:org,workflow"

# Or configure Git user locally
git config user.name "Kyle McAuliffe"
git config user.email "kyle@artometrics.com"
```
