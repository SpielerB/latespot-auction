/**
 * Represents the functions available for the bronze utilities
 */
export default interface BronzeUtilities {
    /**
     * Returns true of the connected wallet has at least one token with bronze level or higher
     */
    hasAccess: () => Promise<boolean>;

    /**
     * Returns a list of categories containing files available for download
     */
    categories: () => Promise<FileCategory[]>;

    /**
     * Downloads a given file. Throws an error if file does not exist
     * @param fileName
     */
    download: (fileName: string) => Promise<void>;
}

/**
 * Represents a category of files in the bronze utilities
 */
export interface FileCategory {
    title: string;
    files: FileData[];
}

/**
 * Represents a file in the bronze utilities
 */
export interface FileData {
    name: string;

    /**
     * Downloads the file (Same as calling {@link BronzeUtilities#download(name)}
     */
    download: () => Promise<void>;
}