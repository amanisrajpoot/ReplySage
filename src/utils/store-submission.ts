export interface StoreListing {
  name: string
  shortDescription: string
  description: string
  category: string
  tags: string[]
  screenshots: string[]
  icon: string
  privacyPolicy: string
  supportUrl: string
  homepageUrl: string
  version: string
  permissions: string[]
  contentRating: string
  languages: string[]
}

export interface StoreAssets {
  icons: {
    '16': string
    '32': string
    '48': string
    '128': string
  }
  screenshots: {
    desktop: string[]
    mobile: string[]
  }
  promotionalImages: {
    tile: string
    marquee: string
  }
}

export interface SubmissionChecklist {
  codeReview: boolean
  securityAudit: boolean
  privacyPolicy: boolean
  permissionsReview: boolean
  contentRating: boolean
  screenshots: boolean
  description: boolean
  testing: boolean
  documentation: boolean
  support: boolean
}

export class StoreSubmissionManager {
  private static instance: StoreSubmissionManager
  private isInitialized = false

  private constructor() {}

  static getInstance(): StoreSubmissionManager {
    if (!StoreSubmissionManager.instance) {
      StoreSubmissionManager.instance = new StoreSubmissionManager()
    }
    return StoreSubmissionManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.isInitialized = true
      console.log('ReplySage: Store submission manager initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize store submission manager:', error)
      throw error
    }
  }

  generateStoreListing(): StoreListing {
    return {
      name: 'ReplySage - AI Email Assistant',
      shortDescription: 'AI-powered email assistant with local processing, smart replies, and privacy-first design.',
      description: `ReplySage is a powerful AI email assistant that helps you manage your inbox more efficiently while maintaining complete privacy and security.

## Key Features

🤖 **AI-Powered Analysis**
- Smart email summarization and analysis
- Action item extraction and deadline tracking
- Sentiment analysis and priority detection
- Thread summarization for complex conversations

💬 **Smart Reply Generation**
- Context-aware reply suggestions
- Multiple tone options (formal, casual, concise)
- Length control (short, medium, long)
- One-click insertion into compose windows

🔍 **Semantic Search**
- Find similar emails using AI embeddings
- Advanced filtering by category, sender, and date
- Intelligent email clustering and organization

📅 **Calendar Integration**
- Automatic event creation from action items
- Date parsing and deadline tracking
- Support for Google Calendar, Outlook, and ICS export

🔒 **Privacy-First Design**
- All AI processing happens locally on your device
- No data sent to external servers unless you opt-in
- End-to-end encryption for sensitive data
- Complete control over your data with export/delete options

⚡ **Performance Optimized**
- WebWorker-based processing for smooth performance
- Quantized AI models for faster inference
- Intelligent caching to avoid reprocessing
- Minimal resource usage

## Privacy & Security

ReplySage is designed with privacy as the top priority:
- Local-first processing with optional cloud fallback
- Your data never leaves your device unless you explicitly consent
- Military-grade encryption for all sensitive data
- Full GDPR and CCPA compliance
- Complete data portability and deletion controls

## Supported Email Clients

- Gmail (primary support)
- Outlook.com
- Yahoo Mail
- iCloud Mail
- Other web-based email clients

## Getting Started

1. Install the extension
2. Open any email in your webmail client
3. Click the ReplySage icon to start analyzing
4. Configure your privacy settings in the options page
5. Enjoy AI-powered email assistance!

## Support

For support, bug reports, or feature requests, please visit our GitHub repository or contact us at support@replysage.com.

## Privacy Policy

Our complete privacy policy is available at privacy@replysage.com. We are committed to transparency and user privacy.`,
      category: 'Productivity',
      tags: [
        'email',
        'ai',
        'assistant',
        'productivity',
        'privacy',
        'gmail',
        'outlook',
        'automation',
        'smart-replies',
        'email-management'
      ],
      screenshots: [
        'screenshots/main-interface.png',
        'screenshots/analysis-panel.png',
        'screenshots/reply-suggestions.png',
        'screenshots/semantic-search.png',
        'screenshots/privacy-settings.png',
        'screenshots/performance-dashboard.png'
      ],
      icon: 'icons/icon-128.png',
      privacyPolicy: 'https://replysage.com/privacy',
      supportUrl: 'https://github.com/replysage/support',
      homepageUrl: 'https://replysage.com',
      version: '1.0.0',
      permissions: [
        'activeTab',
        'storage',
        'scripting'
      ],
      contentRating: 'Everyone',
      languages: ['en']
    }
  }

  generateStoreAssets(): StoreAssets {
    return {
      icons: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png'
      },
      screenshots: {
        desktop: [
          'screenshots/desktop/main-interface.png',
          'screenshots/desktop/analysis-panel.png',
          'screenshots/desktop/reply-suggestions.png',
          'screenshots/desktop/semantic-search.png',
          'screenshots/desktop/privacy-settings.png',
          'screenshots/desktop/performance-dashboard.png'
        ],
        mobile: [
          'screenshots/mobile/main-interface.png',
          'screenshots/mobile/analysis-panel.png',
          'screenshots/mobile/reply-suggestions.png'
        ]
      },
      promotionalImages: {
        tile: 'promotional/tile.png',
        marquee: 'promotional/marquee.png'
      }
    }
  }

  generateSubmissionChecklist(): SubmissionChecklist {
    return {
      codeReview: false,
      securityAudit: false,
      privacyPolicy: false,
      permissionsReview: false,
      contentRating: false,
      screenshots: false,
      description: false,
      testing: false,
      documentation: false,
      support: false
    }
  }

  async validateSubmission(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    checklist: SubmissionChecklist
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const checklist = this.generateSubmissionChecklist()

    // Check code quality
    try {
      const { TestingFramework } = await import('./testing-framework')
      const testing = TestingFramework.getInstance()
      await testing.initialize()
      
      const reports = await testing.runAllTests()
      const totalTests = reports.reduce((sum, r) => sum + r.totalTests, 0)
      const passedTests = reports.reduce((sum, r) => sum + r.passedTests, 0)
      const successRate = (passedTests / totalTests) * 100

      if (successRate < 90) {
        errors.push(`Test success rate is too low: ${successRate.toFixed(1)}%`)
      } else if (successRate < 95) {
        warnings.push(`Test success rate could be improved: ${successRate.toFixed(1)}%`)
      }

      checklist.testing = successRate >= 90
    } catch (error) {
      errors.push('Failed to run tests: ' + (error as Error).message)
    }

    // Check privacy policy
    try {
      const response = await fetch('https://replysage.com/privacy')
      if (response.ok) {
        checklist.privacyPolicy = true
      } else {
        errors.push('Privacy policy is not accessible')
      }
    } catch (error) {
      errors.push('Privacy policy validation failed: ' + (error as Error).message)
    }

    // Check manifest permissions
    try {
      const manifest = await chrome.runtime.getManifest()
      const requiredPermissions = ['activeTab', 'storage', 'scripting']
      const hasAllPermissions = requiredPermissions.every(perm => 
        manifest.permissions?.includes(perm as any)
      )

      if (!hasAllPermissions) {
        errors.push('Missing required permissions in manifest')
      } else {
        checklist.permissionsReview = true
      }
    } catch (error) {
      errors.push('Manifest validation failed: ' + (error as Error).message)
    }

    // Check for required files
    const requiredFiles = [
      'manifest.json',
      'src/background/index.ts',
      'src/content/index.ts',
      'src/options.html',
      'icons/icon-128.png',
      'icons/icon-48.png',
      'icons/icon-32.png',
      'icons/icon-16.png'
    ]

    for (const file of requiredFiles) {
      try {
        await fetch(chrome.runtime.getURL(file))
        // File exists
      } catch (error) {
        errors.push(`Required file missing: ${file}`)
      }
    }

    // Check screenshots
    const listing = this.generateStoreListing()
    if (listing.screenshots.length < 3) {
      errors.push('At least 3 screenshots are required')
    } else {
      checklist.screenshots = true
    }

    // Check description
    if (listing.description.length < 100) {
      errors.push('Description is too short')
    } else if (listing.description.length > 4000) {
      warnings.push('Description is very long, consider shortening')
    } else {
      checklist.description = true
    }

    // Check version
    if (!listing.version || !/^\d+\.\d+\.\d+$/.test(listing.version)) {
      errors.push('Invalid version format')
    }

    // Check support URL
    try {
      const response = await fetch(listing.supportUrl)
      if (!response.ok) {
        warnings.push('Support URL is not accessible')
      } else {
        checklist.support = true
      }
    } catch (error) {
      warnings.push('Support URL validation failed: ' + (error as Error).message)
    }

    // Check documentation
    try {
      const response = await fetch('https://github.com/replysage/docs')
      if (response.ok) {
        checklist.documentation = true
      } else {
        warnings.push('Documentation is not accessible')
      }
    } catch (error) {
      warnings.push('Documentation validation failed: ' + (error as Error).message)
    }

    // Check security audit
    try {
      const { EncryptionManager } = await import('./encryption-manager')
      const encryption = EncryptionManager.getInstance()
      await encryption.initialize()
      
      const keys = encryption.getAllKeys()
      if (keys.length > 0) {
        checklist.securityAudit = true
      } else {
        warnings.push('No encryption keys found - security audit incomplete')
      }
    } catch (error) {
      warnings.push('Security audit failed: ' + (error as Error).message)
    }

    // Check code review
    checklist.codeReview = errors.length === 0

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      checklist
    }
  }

  generateManifest(): any {
    return {
      manifest_version: 3,
      name: 'ReplySage - AI Email Assistant',
      version: '1.0.0',
      description: 'AI-powered email assistant with local processing, smart replies, and privacy-first design.',
      permissions: [
        'activeTab',
        'storage',
        'scripting'
      ],
      host_permissions: [
        'https://mail.google.com/*',
        'https://outlook.live.com/*',
        'https://mail.yahoo.com/*',
        'https://www.icloud.com/*'
      ],
      background: {
        service_worker: 'dist/background/index.js'
      },
      content_scripts: [
        {
          matches: [
            'https://mail.google.com/*',
            'https://outlook.live.com/*',
            'https://mail.yahoo.com/*',
            'https://www.icloud.com/*'
          ],
          js: ['dist/content/index.js'],
          css: ['dist/content/styles.css'],
          run_at: 'document_end'
        }
      ],
      options_page: 'src/options.html',
      action: {
        default_popup: 'src/popup.html',
        default_title: 'ReplySage - AI Email Assistant',
        default_icon: {
          '16': 'icons/icon-16.png',
          '32': 'icons/icon-32.png',
          '48': 'icons/icon-48.png',
          '128': 'icons/icon-128.png'
        }
      },
      icons: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png'
      },
      web_accessible_resources: [
        {
          resources: [
            'dist/*',
            'icons/*',
            'screenshots/*'
          ],
          matches: [
            'https://mail.google.com/*',
            'https://outlook.live.com/*',
            'https://mail.yahoo.com/*',
            'https://www.icloud.com/*'
          ]
        }
      ],
      content_security_policy: {
        extension_pages: "script-src 'self'; object-src 'self'"
      }
    }
  }

  generatePrivacyPolicy(): string {
    return `# Privacy Policy for ReplySage

**Last updated:** ${new Date().toISOString().split('T')[0]}

## Overview

ReplySage is committed to protecting your privacy and ensuring the security of your personal information. This privacy policy explains how we collect, use, and protect your data when you use our browser extension.

## Data Collection

### What We Collect
- **Email Content**: Only when you explicitly request analysis
- **Settings & Preferences**: Your extension configuration
- **Performance Metrics**: Anonymous usage statistics (optional)
- **Error Logs**: Technical information for debugging (optional)

### What We DON'T Collect
- Personal identifying information
- Email addresses or contact information
- Browsing history outside of email clients
- Location data
- Device information beyond what's necessary for functionality

## Data Processing

### Local Processing
- All AI analysis happens locally on your device
- No data is sent to external servers unless you explicitly opt-in
- Your email content never leaves your device during local processing

### Cloud Processing (Optional)
- Only used when you explicitly enable cloud fallback
- Requires your own API keys (OpenAI, Anthropic, etc.)
- Data is sent directly to your chosen provider
- We never see or store your cloud-processed data

## Data Storage

### Local Storage
- All data is stored locally in your browser
- Encrypted using industry-standard AES-256 encryption
- You can export or delete your data at any time

### Data Retention
- Analysis results: 30 days (configurable)
- Performance metrics: 7 days (configurable)
- Settings: Until you delete them
- Audit logs: 90 days (configurable)

## Your Rights

### Data Control
- **Export**: Download all your data in machine-readable format
- **Delete**: Remove all or specific types of data
- **Modify**: Change your privacy settings at any time
- **Access**: View what data we have about you

### Privacy Settings
- Control what data is collected
- Enable/disable specific features
- Set data retention periods
- Manage cloud processing preferences

## Security

### Encryption
- All sensitive data encrypted with AES-256-GCM
- WebCrypto API for secure key generation
- Password-based encryption for additional security

### Data Protection
- PII redaction before any cloud processing
- Secure key storage and management
- Regular security audits and updates

## Third-Party Services

### Cloud AI Providers
- Only used with your explicit consent
- Your API keys are encrypted and stored locally
- We don't have access to your cloud provider accounts

### Analytics (Optional)
- Anonymous usage statistics only
- Can be disabled in settings
- No personal information collected

## Children's Privacy

ReplySage is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.

## Contact Us

If you have any questions about this privacy policy, please contact us at:
- Email: privacy@replysage.com
- GitHub: https://github.com/replysage/support

## Compliance

This privacy policy complies with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Children's Online Privacy Protection Act (COPPA)
- Other applicable privacy laws and regulations`
  }

  generateSupportDocumentation(): string {
    return `# ReplySage Support Documentation

## Getting Started

### Installation
1. Download the extension from the Chrome Web Store
2. Click "Add to Chrome" to install
3. Grant necessary permissions when prompted
4. Open your email client (Gmail, Outlook, etc.)

### First Use
1. Open any email in your webmail client
2. Look for the ReplySage icon in the sidebar
3. Click "Analyze" to start using AI features
4. Configure your privacy settings in the options page

## Features

### AI Analysis
- **Summarization**: Get concise summaries of long emails
- **Action Items**: Automatically extract tasks and deadlines
- **Sentiment Analysis**: Understand the tone and urgency
- **Priority Detection**: Identify important messages

### Smart Replies
- **Context-Aware**: Replies based on email content and context
- **Tone Control**: Choose between formal, casual, or concise
- **Length Options**: Short, medium, or long replies
- **One-Click Insert**: Insert replies directly into compose windows

### Semantic Search
- **Find Similar**: Search emails by meaning, not just keywords
- **Advanced Filters**: Filter by category, sender, date range
- **Smart Clustering**: Group related emails together

### Calendar Integration
- **Event Creation**: Create calendar events from action items
- **Date Parsing**: Automatically detect and parse dates
- **Multiple Calendars**: Support for Google Calendar, Outlook, ICS

## Privacy & Security

### Local Processing
- All AI analysis happens on your device
- No data sent to external servers unless you opt-in
- Complete control over your data

### Cloud Fallback
- Optional cloud processing for complex tasks
- Uses your own API keys (OpenAI, Anthropic, etc.)
- Data sent directly to your chosen provider

### Data Control
- Export all your data anytime
- Delete specific data types or everything
- Configure data retention periods
- View audit logs of all activities

## Troubleshooting

### Common Issues

#### Extension Not Working
1. Check if you're on a supported email client
2. Refresh the page and try again
3. Check browser console for error messages
4. Ensure all permissions are granted

#### AI Analysis Failing
1. Check your internet connection
2. Verify cloud API keys are correct (if using cloud)
3. Try refreshing the page
4. Check if local models are downloaded

#### Performance Issues
1. Check the Performance Dashboard in settings
2. Clear cache and restart browser
3. Disable unnecessary features
4. Update to the latest version

### Error Messages

#### "Analysis Failed"
- Check internet connection
- Verify API keys (if using cloud)
- Try again in a few minutes

#### "Permission Denied"
- Grant necessary permissions in browser settings
- Check if extension is enabled
- Try reinstalling the extension

#### "Model Not Found"
- Download required AI models in settings
- Check available storage space
- Try refreshing the page

## Settings

### Privacy Settings
- **Data Collection**: Control what data is collected
- **Analytics**: Enable/disable anonymous usage statistics
- **Cloud Processing**: Configure cloud AI providers
- **Data Retention**: Set how long data is kept

### AI Settings
- **Model Selection**: Choose between local and cloud models
- **Performance**: Configure performance vs accuracy trade-offs
- **Caching**: Enable/disable result caching

### Interface Settings
- **Theme**: Choose light or dark mode
- **Language**: Select your preferred language
- **Notifications**: Configure notification preferences

## Support

### Getting Help
- **Documentation**: Check this guide first
- **GitHub Issues**: Report bugs and request features
- **Email Support**: contact@replysage.com
- **Community**: Join our Discord server

### Reporting Issues
When reporting issues, please include:
1. Browser version and type
2. Extension version
3. Steps to reproduce the issue
4. Error messages (if any)
5. Screenshots (if helpful)

### Feature Requests
We welcome feature requests! Please submit them via:
- GitHub Issues
- Email to features@replysage.com
- Discord community

## Updates

### Automatic Updates
- Extension updates automatically
- Check for updates in browser settings
- New features announced via release notes

### Version History
- **v1.0.0**: Initial release with core features
- See GitHub releases for detailed changelog

## Legal

### Terms of Service
- Available at https://replysage.com/terms
- Updated periodically
- Continued use constitutes acceptance

### Privacy Policy
- Available at https://replysage.com/privacy
- Explains data collection and usage
- Compliant with GDPR and CCPA

### License
- Open source under MIT License
- Source code available on GitHub
- Contributions welcome`
  }

  async generateSubmissionPackage(): Promise<{
    manifest: any
    privacyPolicy: string
    supportDocs: string
    storeListing: StoreListing
    assets: StoreAssets
    checklist: SubmissionChecklist
  }> {
    const validation = await this.validateSubmission()
    
    if (!validation.isValid) {
      throw new Error(`Submission validation failed: ${validation.errors.join(', ')}`)
    }

    return {
      manifest: this.generateManifest(),
      privacyPolicy: this.generatePrivacyPolicy(),
      supportDocs: this.generateSupportDocumentation(),
      storeListing: this.generateStoreListing(),
      assets: this.generateStoreAssets(),
      checklist: validation.checklist
    }
  }
}
