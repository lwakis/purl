import type { RuDictionary } from './ru';

function pluralEn(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}

export const en: RuDictionary = {
  common: {
    close: 'Close',
    save: 'Save',
    dismissError: 'Dismiss error message',
  },
  header: {
    toggleSidebar: 'Toggle sidebar',
    newDesign: 'New design',
    saveProject: 'Save project',
    projectSaved: 'Project saved',
    openCode: 'Open code',
    openChat: 'Open chat',
    code: 'Code',
    chat: 'Chat',
    switchLanguage: 'Switch language',
  },
  status: {
    analysis: 'Analyzing prompt...',
    design: 'Designing...',
    code: 'Generating code...',
    done: 'Done!',
    processingEdits: 'Processing edits...',
    analysisEdits: 'Analyzing edits...',
    designEdits: 'Updating design...',
  },
  progress: {
    analysis: 'Prompt analysis',
    design: 'Design',
    code: 'Code generation',
    cancel: 'Cancel',
    cancelAria: 'Cancel generation',
    processing: 'Processing',
  },
  chat: {
    iterations: (n: number) => `${n} ${pluralEn(n, 'iteration', 'iterations')}`,
    whatToChange: 'What would you like to change in the design?',
    createFirst: 'Create a design first, then discuss changes',
    inputPlaceholder: 'What to change?',
    inputAria: 'Chat message',
    errorOccurred: 'An error occurred: {message}. Please try again.',
    designUpdated: 'Done! I updated the design according to your changes.',
  },
  empty: {
    title: 'Create a design from a text description',
    subtitle:
      'Describe what you need — and get a ready HTML/CSS design in seconds. Refine it in a conversation.',
  },
  preview: {
    title: 'Preview',
    refresh: 'Refresh preview',
    sizeAria: 'Preview: {size}',
    iframeTitle: 'Design preview',
    emptyTitle: 'Your design will appear here',
    emptySubtitle: 'Enter a prompt and click Generate',
  },
  prompt: {
    themeDark: 'Dark',
    themeLight: 'Light',
    themeAuto: 'Auto',
    styleMinimal: 'Minimal',
    styleCorporate: 'Corporate',
    stylePlayful: 'Playful',
    styleTechno: 'Techno',
    placeholder:
      'Describe the design you want... (e.g. Landing page for an HR automation SaaS, dark theme, corporate style)',
    aria: 'Design description',
    generating: 'Generating...',
    generate: 'Generate',
  },
  code: {
    copyTitle: 'Copy code',
    copy: 'Copy',
    downloadTitle: 'Download HTML',
    download: 'Download',
    downloadZipTitle: 'Download as ZIP',
    shareTitle: 'Share',
    share: 'Share',
    reactTitle: 'Export to React',
    copied: 'Code copied to clipboard',
    copyFailed: 'Failed to copy code',
    downloadStarted: 'Download started',
    reactSoon: 'React export coming soon',
    empty: 'Generated code will appear here',
    zipTitle: 'Purl design export',
    zipGenerated: 'Generated with Purl — AI design generator.',
    zipOpen: 'Open index.html in any browser to view the design.',
  },
  saveDialog: {
    title: 'Save project',
    nameLabel: 'Project name',
    namePlaceholder: 'e.g. Landing page for a startup',
    saving: 'Saving...',
  },
  shareDialog: {
    title: 'Share design',
    description:
      'Create a public link to share the design. Anyone with the link will be able to view it.',
    create: 'Create link',
    creating: 'Creating...',
    linkAria: 'Public share link',
    copyLinkAria: 'Copy link',
    iframeTitle: 'Shared design preview',
    anyoneCanView: 'Anyone with this link can view the design',
    createFailed: 'Failed to create link',
    copied: 'Link copied',
    copyFailed: 'Failed to copy link',
  },
  shareView: {
    invalidLink: 'The link is invalid or has expired',
    notFound: 'Design not found',
    openPurl: 'Open Purl',
    openInPurl: 'Open in Purl',
    iframeTitle: 'Shared design preview',
    emptyContent: 'This design has no content',
  },
  sidebar: {
    title: 'Projects',
    newProject: 'New project',
    closeAria: 'Close projects panel',
    emptyTitle: 'No projects yet',
    emptySubtitle: 'Create a design and save it',
    versionsAria: 'Project versions',
    deleteAria: 'Delete project',
    noVersions: 'No versions yet',
    version: 'Version {num}',
    deleteConfirm: 'Delete project? This action cannot be undone.',
  },
  templates: {
    title: 'Templates',
    refreshAria: 'Refresh templates',
    categoryAll: 'All',
    categoryLanding: 'Landing',
    categoryDashboard: 'Dashboard',
    categoryForm: 'Form',
    empty: 'No templates in the "{category}" category',
    // English starter template content, keyed by category (see localizeTemplate).
    items: {
      landing: {
        title: 'SaaS Landing Page',
        description:
          'One-page landing for a SaaS product with header, benefits, pricing and a form',
        prompt:
          'Create a modern landing page for a SaaS product. Add a header with logo and navigation, a hero section with a headline and CTA, a benefits block (3-4 cards), a pricing section (3 columns) and a contact form. Use gradients and micro-animations.',
      },
      dashboard: {
        title: 'Analytics Dashboard',
        description: 'Control panel with charts, metrics and a sidebar menu',
        prompt:
          'Create an analytics dashboard with a sidebar menu (home, analytics, users, settings), a top bar with key metrics (4 KPI cards), a chart area (line chart and bar chart) and a data table. Dark theme.',
      },
      form: {
        title: 'Registration Form',
        description: 'Modern registration form with validation and a progress bar',
        prompt:
          'Create a registration page with a progress bar (3 steps). Step one: name and email. Step two: password and confirmation. Step three: interests selection (chips). Add real-time field validation, smooth transitions between steps and a nice illustration on the side.',
      },
      pricing: {
        title: 'Pricing Page',
        description: 'Page with three pricing plans, feature comparison and CTA',
        prompt:
          'Create a pricing page with three plans (Basic, Pro, Business). Each plan: name, price, a list of features with checkmarks, and a CTA button. Highlight the middle plan as recommended. Add a monthly/yearly billing toggle with a discount. At the bottom — a section comparing all features in a table.',
      },
      onboarding: {
        title: 'Onboarding',
        description: 'Step-by-step onboarding with illustrations and a progress indicator',
        prompt:
          "Create a step-by-step onboarding with 4 screens. Each screen: a large illustration (SVG icon), a title, a description, a progress indicator (dots) and 'Back'/'Next' buttons. The last step has a 'Start' button. Use smooth slide transitions.",
      },
      content: {
        title: 'Blog / Article',
        description: 'Blog article with table of contents, header and comments',
        prompt:
          'Create a blog article page. Add a header with metadata (author, date, category, reading time), a cover image, article content with subheadings, a quote block, and an image with a caption. At the bottom — a comments section with a form and a list. On the right — a sidebar with a table of contents and related articles.',
      },
      portfolio: {
        title: 'Portfolio',
        description: 'Portfolio with a project grid and filtering',
        prompt:
          "Create a portfolio page with filtering by categories (All, Web Design, UI/UX, Branding). A masonry-style project grid (2-3 columns). Each project: a cover image, a title, a category. On hover — an overlay with a 'Details' button. Add a modal window for detailed viewing.",
      },
      contact: {
        title: 'Contacts',
        description: 'Contact page with a form and a map',
        prompt:
          'Create a two-column contact page. On the left: contact information (address, phone, email, working hours) with icons and links to social networks. On the right: a feedback form (name, email, subject, message) with validation. Add an interactive map (a placeholder iframe is fine).',
      },
    },
  },
  app: {
    sendAria: 'Send',
    panelAria: 'Designer panel',
    tabsAria: 'Chat and code panel',
    closePanelAria: 'Close panel',
  },
  errors: {
    network: 'Failed to connect to the server',
    rateLimit: 'Rate limit exceeded, please try again later',
    serverError: 'Server error ({status})',
    timeout: 'Server response timed out',
    bodyUnreadable: 'Response body is not readable',
    connectionLost: 'Connection to the server was interrupted',
    cancelled: 'Generation cancelled',
    sessionCreateFailed: 'Failed to create a session. Please try again.',
    sessionInitFailed: 'Failed to create a session. Refresh the page and try again.',
    loadProjects: 'Failed to load projects',
    createProject: 'Failed to create project',
    updateProject: 'Failed to update project',
    deleteProject: 'Failed to delete project',
  },
  toasts: {
    projectSaved: 'Project saved',
    projectDeleted: 'Project deleted',
  },
};
