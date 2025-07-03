// | **Abstract Factory** |
interface CloudSericeFactory {
    createStorage(): StorageService;
    createDatabase(): DatabaseService;
    createQueue(): QueueService;
}

interface StorageService {
    uploadFile(file: string): Promise<string>;
    downloadFile(fileId: string): Promise<string>;
}

interface DatabaseService {
    saveData(data: any): Promise<void>;
    getData(id: string): Promise<any>;
}

interface QueueService {
    sendMessage(message: string): Promise<void>;
    receiveMessage(): Promise<string>;
}

class AWSCloudServiceFactory implements CloudSericeFactory {
    createStorage(): StorageService {
        return new AWSStorageService();
    }

    createDatabase(): DatabaseService {
        return new AWSDatabaseService();
    }

    createQueue(): QueueService {
        return new AWSQueueService();
    }
}

class AzureCloudServiceFactory implements CloudSericeFactory {
    createStorage(): StorageService {
        return new AzureStorageService();
    }

    createDatabase(): DatabaseService {
        return new AzureDatabaseService();
    }

    createQueue(): QueueService {
        return new AzureQueueService();
    }
}

// Services

class AWSStorageService implements StorageService {
    async uploadFile(file: string): Promise<string> {
        console.log(`Uploading file to AWS: ${file}`);
        return `aws://${file}`;
    }

    async downloadFile(fileId: string): Promise<string> {
        console.log(`Downloading file from AWS: ${fileId}`);
        return `File content from AWS for ${fileId}`;
    }
}

class AzureStorageService implements StorageService {
    async uploadFile(file: string): Promise<string> {
        console.log(`Uploading file to Azure: ${file}`);
        return `azure://${file}`;
    }

    async downloadFile(fileId: string): Promise<string> {
        console.log(`Downloading file from Azure: ${fileId}`);
        return `File content from Azure for ${fileId}`;
    }
}

class AWSDatabaseService implements DatabaseService {
    async saveData(data: any): Promise<void> {
        console.log(`Saving data to AWS database: ${JSON.stringify(data)}`);
    }

    async getData(id: string): Promise<any> {
        console.log(`Getting data from AWS database for ID: ${id}`);
        return { id, content: "Sample data from AWS" };
    }
}

class AzureDatabaseService implements DatabaseService {
    async saveData(data: any): Promise<void> {
        console.log(`Saving data to Azure database: ${JSON.stringify(data)}`);
    }

    async getData(id: string): Promise<any> {
        console.log(`Getting data from Azure database for ID: ${id}`);
        return { id, content: "Sample data from Azure" };
    }
}

class AWSQueueService implements QueueService {
    async sendMessage(message: string): Promise<void> {
        console.log(`Sending message to AWS queue: ${message}`);
    }

    async receiveMessage(): Promise<string> {
        console.log(`Receiving message from AWS queue`);
        return "Sample message from AWS queue";
    }
}

class AzureQueueService implements QueueService {
    async sendMessage(message: string): Promise<void> {
        console.log(`Sending message to Azure queue: ${message}`);
    }

    async receiveMessage(): Promise<string> {
        console.log(`Receiving message from Azure queue`);
        return "Sample message from Azure queue";
    }
}

// Example usage
async function main() {
    const awsFactory = new AWSCloudServiceFactory();
    const awsStorage = awsFactory.createStorage();
    const awsDatabase = awsFactory.createDatabase();
    const awsQueue = awsFactory.createQueue();

    await awsStorage.uploadFile("example.txt");
    await awsDatabase.saveData({ id: "1", content: "Hello AWS" });
    await awsQueue.sendMessage("Hello AWS Queue");

    const azureFactory = new AzureCloudServiceFactory();
    const azureStorage = azureFactory.createStorage();
    const azureDatabase = azureFactory.createDatabase();
    const azureQueue = azureFactory.createQueue();

    await azureStorage.uploadFile("example.txt");
    await azureDatabase.saveData({ id: "1", content: "Hello Azure" });
    await azureQueue.sendMessage("Hello Azure Queue");
}

main().catch(console.error);