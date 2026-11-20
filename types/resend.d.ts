declare module 'resend' {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(opts: any): Promise<{ data: any; error: any }>;
    };
  }
}
