export const getUsage = (): string => {
    return `Usage: ipeds-fetch --years <spec> --tables <patterns> [options]

Options:
  --years <spec>         Year specification (required)
  --tables <patterns>    Table pattern(s), comma-separated (required)
  --list[:format]        List matching tables instead of downloading
                         Formats: text (default), json, tsv
  --with-dictionaries    Also download data dictionaries
  --output <dir>         Output directory (default: current working directory)
  --delay <ms>           Delay in milliseconds between downloads
  --help                 Show help
  --version              Show version
`;
};
