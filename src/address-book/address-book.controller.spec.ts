import { Test, TestingModule } from '@nestjs/testing';
import { AddressBookController } from './address-book.controller';

describe('AddressBookController', () => {
  let controller: AddressBookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressBookController],
    }).compile();

    controller = module.get<AddressBookController>(AddressBookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
