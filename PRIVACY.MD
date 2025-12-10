# Privacy Policy for AiLex

**Last Updated:** December 8, 2025

## Overview

AiLex is a browser extension that provides an AI-powered chat interface for interacting with various AI models. We are committed to protecting your privacy and ensuring transparency about how your data is handled.

## Data Collection and Storage

### What We Collect

AiLex collects and stores the following data **locally on your device**:

1. **API Keys and Provider Settings**
   - API keys for AI providers (OpenAI, Anthropic, OpenRouter, Grok, Gemini, LM Studio)
   - Custom API endpoints
   - Selected AI models and preferences
   - Generation settings (temperature, token limits, etc.)

2. **Chat History**
   - Messages sent to and received from AI models
   - Attached files, images, screenshots, and DOM elements
   - Browser tab references and page contexts
   - Token usage statistics
   - Timestamps and metadata

3. **Personal Information** (optional, user-provided)
   - Name, email, phone number
   - Address details (country, region, city, postal code)
   - Professional information (job title, company)
   - Social media profiles (LinkedIn, GitHub, Twitter, etc.)
   - Custom bio

4. **Extension Settings**
   - Theme preferences (dark/light mode, color schemes)
   - Language selection
   - Font preferences
   - Tool configurations
   - Custom instructions and prompts
   - Folder organization for chats

5. **Developer Logs** (when enabled)
   - API request/response logs
   - Error messages
   - Performance metrics

### Where Data is Stored

**All data is stored locally on your device** using:
- **IndexedDB**: For chat history, personal information, and API logs
- **chrome.storage.local**: For extension settings and encrypted API keys

**We do not operate any servers** - your data never leaves your device except when sent to AI providers.

## Data Usage

### How We Use Your Data

1. **API Keys**: Used exclusively to authenticate with AI providers you choose
2. **Chat History**: Stored locally for your reference and context management
3. **Personal Information**: Used only for autofill features when you explicitly trigger them
4. **Page Context**: Extracted only when you enable "Current Page" feature
5. **Settings**: Applied to customize your experience

### Third-Party Data Sharing

When you use AiLex, your data is sent **directly from your browser** to the AI providers you select:

- **OpenAI** (api.openai.com)
- **Anthropic** (api.anthropic.com)
- **Google Gemini** (generativelanguage.googleapis.com)
- **OpenRouter** (openrouter.ai)
- **X.AI/Grok** (api.x.ai)
- **DeepSeek** (api.deepseek.com)
- **LM Studio** (localhost or custom endpoints)

**Important:** Each AI provider has its own privacy policy and data handling practices. Please review their policies:
- [OpenAI Privacy Policy](https://openai.com/privacy)
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [Google Privacy Policy](https://policies.google.com/privacy)

**We do not have access to, collect, or store any data you send to these providers.**

## Data Security

### Security Measures

1. **API Key Encryption**: All API keys are encrypted before storage using browser cryptography APIs
2. **Local Storage Only**: No data is transmitted to our servers
3. **Secure Communication**: All API requests use HTTPS
4. **No Analytics**: We do not collect usage statistics or analytics

### Your Control

You have complete control over your data:

1. **Export Settings**: Export all your settings and data to a JSON file
2. **Delete Data**: 
   - Delete individual chats or messages
   - Clear all chat history
   - Remove personal information
   - Clear API logs
3. **Uninstall**: Removing the extension deletes all locally stored data

## Permissions

### Why We Request Permissions

- **activeTab**: To extract page context when you enable "Current Page" feature
- **storage**: To save settings and chat history locally
- **contextMenus**: To provide right-click menu commands
- **tabs**: To access tab information for comparison features
- **scripting**: To interact with web pages for tools and autofill
- **webRequest**: For developer mode API logging (optional)

### Camera and Microphone

- **Camera**: Accessed only when you explicitly use the webcam capture feature
- **Microphone**: Accessed only when you explicitly use voice input
- Both require explicit browser permission and can be revoked at any time

## Data Retention

- **Chat History**: Retained until you delete it
- **API Logs**: Limited to 200 entries, automatically rotated
- **Settings**: Retained until you uninstall the extension

## Children's Privacy

AiLex is not intended for users under 13 years of age. We do not knowingly collect data from children.

## Changes to Privacy Policy

We may update this Privacy Policy from time to time. Updates will be reflected in the "Last Updated" date at the top of this document.

## Open Source

AiLex is open-source software. You can review our code to verify our privacy practices.

## Contact

For privacy concerns or questions, please open an issue on our GitHub repository.

## Your Rights

You have the right to:
- Access all data stored by the extension
- Export your data in machine-readable format (JSON)
- Delete all or specific data
- Opt-out of any optional features
- Uninstall the extension at any time

## Data Breaches

Since all data is stored locally on your device and we operate no servers, there is no risk of a data breach from our infrastructure. Your data security depends on your device security and the security practices of the AI providers you choose to use.

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) principles

---

**Remember:** You are in control of your data. AiLex is designed with privacy-first principles, storing everything locally and giving you complete control over what data you share with AI providers.

