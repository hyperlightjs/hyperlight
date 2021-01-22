interface HyperlightServerSettings {
  host: string
  port: string
}

export class HyperlightServer {
  settings: HyperlightServerSettings

  constructor(settings: HyperlightServerSettings) {
    this.settings = settings
  }

  async productionServer() {
    /* Production server core logic */
  }
}
