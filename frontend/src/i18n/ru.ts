function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export const ru = {
  common: {
    close: 'Закрыть',
    dismissError: 'Закрыть сообщение об ошибке',
  },
  header: {
    toggleSidebar: 'Переключить боковую панель',
    newDesign: 'Новый дизайн',
    openCode: 'Открыть код',
    openChat: 'Открыть чат',
    code: 'Код',
    chat: 'Чат',
    switchLanguage: 'Переключить язык',
  },
  autosave: {
    saving: 'Сохранение…',
    saved: 'Сохранено',
    error: 'Не удалось сохранить',
  },
  status: {
    analysis: 'Анализирую промпт...',
    design: 'Разрабатываю дизайн...',
    code: 'Генерирую код...',
    done: 'Готово!',
    processingEdits: 'Обрабатываю правки...',
    analysisEdits: 'Анализирую правки...',
    designEdits: 'Обновляю дизайн...',
  },
  progress: {
    analysis: 'Анализ промпта',
    design: 'Разработка дизайна',
    code: 'Генерация кода',
    cancel: 'Отмена',
    cancelAria: 'Отменить генерацию',
  },
  chat: {
    iterations: (n: number) => `${n} ${pluralRu(n, 'итерация', 'итерации', 'итераций')}`,
    you: 'Вы',
    assistant: 'Ассистент',
    whatToChange: 'Что вы хотите изменить в дизайне?',
    createFirst: 'Сначала создайте дизайн, затем обсуждайте правки',
    inputPlaceholder: 'Что изменить?',
    inputAria: 'Сообщение в чат',
    errorOccurred: 'Произошла ошибка: {message}. Пожалуйста, попробуйте ещё раз.',
    designUpdated: 'Готово! Я обновил дизайн согласно вашим правкам.',
  },
  preview: {
    title: 'Предпросмотр',
    refresh: 'Обновить предпросмотр',
    sizeAria: 'Предпросмотр: {size}',
    iframeTitle: 'Предпросмотр дизайна',
    emptyTitle: 'Ваш дизайн появится здесь',
    emptySubtitle: 'Введите промпт и нажмите «Сгенерировать»',
    print: 'Отпечаток',
    linkOpened: 'Ссылка открыта в новой вкладке',
    linkBlocked: 'Внутренние ссылки в предпросмотре недоступны',
  },
  prompt: {
    title: 'Что вы хотите создать?',
    subtitle: 'Опишите идею на естественном языке — получите готовую страницу',
    placeholder: 'Опишите, что создать...',
    aria: 'Описание дизайна',
    generating: 'Генерация...',
    generate: 'Сгенерировать',
    example1: 'Лендинг для HR-SaaS',
    example2: 'Дашборд аналитики',
    example3: 'Форма регистрации',
    example4: 'Портфолио с фильтрами',
  },
  code: {
    copyTitle: 'Копировать код',
    copy: 'Копировать',
    downloadTitle: 'Скачать HTML',
    download: 'Скачать',
    downloadZipTitle: 'Скачать как ZIP',
    reactTitle: 'Экспорт в React',
    copied: 'Код скопирован в буфер обмена',
    copyFailed: 'Не удалось скопировать код',
    downloadStarted: 'Скачивание начато',
    reactSoon: 'Экспорт в React скоро появится',
    empty: 'Сгенерированный код появится здесь',
    source: 'исходник · index.html',
    zipTitle: 'Purl design export',
    zipGenerated: 'Generated with Purl — AI design generator.',
    zipOpen: 'Open index.html in any browser to view the design.',
  },
  sidebar: {
    title: 'Проекты',
    newProject: 'Новый проект',
    closeAria: 'Закрыть панель проектов',
    emptyTitle: 'Проектов пока нет',
    emptySubtitle: 'Создайте дизайн и сохраните его',
    versionsAria: 'Версии проекта',
    deleteAria: 'Удалить проект',
    noVersions: 'Версий пока нет',
    version: 'Версия {num}',
    deleteConfirm: 'Удалить проект? Это действие нельзя отменить.',
  },
  app: {
    sendAria: 'Отправить',
    panelAria: 'Панель дизайнера',
    tabsAria: 'Панель чата и кода',
    closePanelAria: 'Закрыть панель',
  },
  errors: {
    title: 'Ошибка',
    network: 'Не удалось связаться с сервером',
    rateLimit: 'Превышен лимит запросов, попробуйте позже',
    serverError: 'Ошибка сервера ({status})',
    timeout: 'Превышено время ожидания ответа сервера',
    bodyUnreadable: 'Ответ сервера нечитаем',
    connectionLost: 'Соединение с сервером прервано',
    cancelled: 'Генерация отменена',
    loadProjects: 'Не удалось загрузить проекты',
    createProject: 'Не удалось создать проект',
    updateProject: 'Не удалось обновить проект',
    deleteProject: 'Не удалось удалить проект',
  },
  toasts: {
    projectSaved: 'Проект сохранён',
    projectDeleted: 'Проект удалён',
  },
};

export type RuDictionary = typeof ru;
