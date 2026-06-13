export abstract class BaseEntity {
  id: number;
  createdDate: Date;
  updatedDate: Date;
  isDeleted: boolean;
  deletedDate: Date | null;
}
